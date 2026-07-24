import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ApiError, requireUser, respondToError } from "@/lib/auth";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const requester = await requireUser();
    const { id } = await params;

    const member = await db.user.findUnique({
      where: { id },
      include: {
        invitedMembers: { orderBy: { joinedAt: "desc" }, include: { invitedMembers: true } },
        invitedBy: true
      }
    });

    if (!member) {
      throw new ApiError(404, "Member not found");
    }

    if (requester.role !== "MASTER" && member.organisationId !== requester.organisationId) {
      throw new ApiError(404, "Member not found");
    }

    return NextResponse.json(member);
  } catch (error) {
    return respondToError(error);
  }
}
