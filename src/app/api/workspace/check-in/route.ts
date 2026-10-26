import { NextResponse } from "next/server";
import { ApiError, requireUser, respondToError } from "@/lib/auth";
import { db } from "@/lib/db";
import { readToken } from "@/lib/product/tokens";
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const { token } = await request.json();
    const c = readToken(String(token ?? ""), "attendance");
    const [membership, programme] = await Promise.all([
      db.organisationMembership.findUnique({
        where: {
          organisationId_userId: {
            organisationId: c.organisationId,
            userId: user.id,
          },
        },
      }),
      db.programme.findFirst({
        where: { id: c.id, organisationId: c.organisationId, status: "ACTIVE" },
      }),
    ]);
    if (
      !membership ||
      membership.status !== "ACTIVE" ||
      (membership.expiresAt && membership.expiresAt < new Date()) ||
      !programme
    )
      throw new ApiError(
        403,
        "You need an active membership to check in to this programme.",
      );
    if (
      (programme.startsAt &&
        Date.now() < programme.startsAt.getTime() - 3600000) ||
      (programme.endsAt &&
        Date.now() > programme.endsAt.getTime() + 4 * 3600000)
    )
      throw new ApiError(
        400,
        "Check-in is not open for this programme at the moment. Ask an organiser for help.",
      );
    const result = await db.attendanceRecord.upsert({
      where: { programmeId_userId: { programmeId: c.id, userId: user.id } },
      create: {
        programmeId: c.id,
        userId: user.id,
        checkedInAt: new Date(),
        createdBy: user.id,
      },
      update: {},
    });
    await db.auditLog.create({
      data: {
        organisationId: c.organisationId,
        actorId: user.id,
        action: "Programme QR check-in",
        entityType: "attendance",
        entityId: result.id,
      },
    });
    return NextResponse.json({
      message: "You're checked in. Thank you for being here.",
      programme: programme.title,
      checkedInAt: result.checkedInAt,
    });
  } catch (error) {
    return respondToError(error);
  }
}
