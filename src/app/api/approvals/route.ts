import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, resolveOrganisationId, respondToError, selectedOrgScope } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const requester = await requireRole(["PRESIDENT", "ADMIN", "MASTER"]);
    const organisationId = await resolveOrganisationId(requester, request);
    const scope = selectedOrgScope(organisationId);

    const approvals = await db.approval.findMany({
      where: {
        status: "PENDING",
        announcement: scope
      },
      orderBy: { createdAt: "asc" },
      include: { announcement: true, event: true }
    });

    return NextResponse.json(approvals);
  } catch (error) {
    return respondToError(error);
  }
}
