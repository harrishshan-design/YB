import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, requireRole, respondToError } from "@/lib/auth";
import { workspaceContext } from "@/lib/product/server";
import { canManage } from "@/lib/product/types";

const patchApprovalSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  note: z.string().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const context = await workspaceContext(request);
    if (!canManage(context.role))
      throw new ApiError(403, "Organisation admin access is required.");
    const requester = context.user;
    const { id } = await params;
    const body = patchApprovalSchema.parse(await request.json());

    const existing = await db.approval.findUnique({
      where: { id },
      include: { announcement: true },
    });
    if (!existing) {
      throw new ApiError(404, "Approval not found");
    }
    if (existing.announcement?.organisationId !== context.organisationId) {
      throw new ApiError(404, "Approval not found");
    }

    const approval = await db.approval.update({
      where: { id },
      data: {
        status: body.status,
        reviewerId: requester.id,
        note: body.note,
        reviewedAt: new Date(),
      },
    });

    return NextResponse.json(approval);
  } catch (error) {
    return respondToError(error);
  }
}
