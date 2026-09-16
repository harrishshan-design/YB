import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole, requireUser, resolveOrganisationId, respondToError, selectedOrgScope } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const requester = await requireUser();
    const organisationId = await resolveOrganisationId(requester, request);

    const meetings = await db.meeting.findMany({
      where: selectedOrgScope(organisationId),
      orderBy: { startsAt: "asc" },
      include: { attendance: { include: { user: true } } }
    });

    return NextResponse.json(meetings);
  } catch (error) {
    return respondToError(error);
  }
}

const createMeetingSchema = z.object({
  title: z.string().min(3),
  agenda: z.string().min(5),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  location: z.string().optional(),
  meetUrl: z.string().url().optional(),
  invitedMemberIds: z.array(z.string()).default([])
});

export async function POST(request: Request) {
  try {
    const requester = await requireRole(["PRESIDENT", "ADMIN", "MASTER"]);
    const organisationId = await resolveOrganisationId(requester, request);
    const body = createMeetingSchema.parse(await request.json());

    const meeting = await db.meeting.create({
      data: {
        title: body.title,
        agenda: body.agenda,
        startsAt: body.startsAt,
        endsAt: body.endsAt,
        location: body.location,
        meetUrl: body.meetUrl,
        createdBy: requester.id,
        organisationId,
        attendance: { create: body.invitedMemberIds.map((userId) => ({ userId, status: "INVITED" as const })) }
      },
      include: { attendance: true }
    });

    return NextResponse.json(meeting, { status: 201 });
  } catch (error) {
    return respondToError(error);
  }
}
