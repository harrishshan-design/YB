import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, resolveOrganisationId, respondToError, selectedOrgScope } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const requester = await requireUser();
    const organisationId = await resolveOrganisationId(requester, request);

    const programmes = await db.programme.findMany({
      where: selectedOrgScope(organisationId),
      orderBy: { createdAt: "desc" },
      take: 20
    });

    return NextResponse.json(programmes);
  } catch (error) {
    return respondToError(error);
  }
}
