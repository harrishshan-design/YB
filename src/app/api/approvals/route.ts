import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, respondToError } from "@/lib/auth";

export async function GET() {
  try {
    const requester = await requireRole(["PRESIDENT", "ADMIN", "MASTER"]);

    const approvals = await db.approval.findMany({
      where: {
        status: "PENDING",
        ...(requester.role === "MASTER" ? {} : { announcement: { organisationId: requester.organisationId } })
      },
      orderBy: { createdAt: "asc" },
      include: { announcement: true, event: true }
    });

    return NextResponse.json(approvals);
  } catch (error) {
    return respondToError(error);
  }
}
