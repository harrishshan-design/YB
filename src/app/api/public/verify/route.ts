import { NextResponse } from "next/server";
import { ApiError, respondToError } from "@/lib/auth";
import { db } from "@/lib/db";
import { readToken } from "@/lib/product/tokens";
export async function GET(request: Request) {
  try {
    const claims = readToken(
      new URL(request.url).searchParams.get("token") ?? "",
      "card",
    );
    const membership = await db.organisationMembership.findUnique({
      where: {
        organisationId_userId: {
          organisationId: claims.organisationId,
          userId: claims.id,
        },
      },
      include: {
        organisation: { select: { name: true } },
        user: { select: { name: true, isActive: true } },
      },
    });
    if (!membership) throw new ApiError(404, "Membership not found.");
    return NextResponse.json(
      {
        name: membership.user.name,
        organisation: membership.organisation.name,
        number: membership.number,
        status: !membership.user.isActive
          ? "INACTIVE"
          : membership.expiresAt && membership.expiresAt < new Date()
            ? "EXPIRED"
            : membership.status,
        expiresAt: membership.expiresAt,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return respondToError(error);
  }
}
