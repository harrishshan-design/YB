import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  requireRole,
  resolveOrganisationId,
  respondToError,
  selectedOrgScope,
} from "@/lib/auth";
import { workspaceContext } from "@/lib/product/server";
import { canManage } from "@/lib/product/types";
import { ApiError } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const context = await workspaceContext(request);
    if (!canManage(context.role))
      throw new ApiError(403, "Organisation admin access is required.");
    const organisationId = context.organisationId;
    const scope = selectedOrgScope(organisationId);

    const approvals = await db.approval.findMany({
      where: {
        status: "PENDING",
        announcement: scope,
      },
      orderBy: { createdAt: "asc" },
      include: { announcement: true, event: true },
    });

    return NextResponse.json(approvals);
  } catch (error) {
    return respondToError(error);
  }
}
