import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole, respondToError } from "@/lib/auth";

const patchApprovalSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  note: z.string().optional()
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const requester = await requireRole(["PRESIDENT", "ADMIN", "MASTER"]);
    const { id } = await params;
    const body = patchApprovalSchema.parse(await request.json());

    const approval = await db.approval.update({
      where: { id },
      data: { status: body.status, reviewerId: requester.id, note: body.note, reviewedAt: new Date() }
    });

    return NextResponse.json(approval);
  } catch (error) {
    return respondToError(error);
  }
}
