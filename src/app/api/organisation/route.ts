import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ApiError, requireUser, respondToError } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireUser();

    if (!user.organisationId) {
      throw new ApiError(404, "You are not part of an organisation");
    }

    const organisation = await db.organisation.findUnique({
      where: { id: user.organisationId },
      include: { _count: { select: { users: true } } }
    });

    if (!organisation) {
      throw new ApiError(404, "Organisation not found");
    }

    return NextResponse.json({
      id: organisation.id,
      name: organisation.name,
      description: organisation.description,
      inviteCode: organisation.inviteCode,
      memberCount: organisation._count.users
    });
  } catch (error) {
    return respondToError(error);
  }
}
