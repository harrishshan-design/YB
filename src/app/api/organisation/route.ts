import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  ApiError,
  requireUser,
  resolveOrganisationId,
  respondToError,
} from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const organisationId = await resolveOrganisationId(user, request);

    if (!organisationId) {
      throw new ApiError(404, "You are not part of an organisation");
    }

    const organisation = await db.organisation.findUnique({
      where: { id: organisationId },
      include: { _count: { select: { users: true } } },
    });

    if (!organisation) {
      throw new ApiError(404, "Organisation not found");
    }

    return NextResponse.json({
      id: organisation.id,
      name: organisation.name,
      description: organisation.description,
      inviteCode: organisation.inviteCode,
      memberCount: organisation._count.users,
    });
  } catch (error) {
    return respondToError(error);
  }
}
