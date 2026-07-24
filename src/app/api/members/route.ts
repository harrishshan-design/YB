import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { orgScope, requireUser, respondToError } from "@/lib/auth";

export async function GET() {
  try {
    const requester = await requireUser();

    const members = await db.user.findMany({
      where: { role: "MEMBER", ...orgScope(requester) },
      orderBy: [{ points: "desc" }, { name: "asc" }],
      include: {
        invitedBy: true,
        invitedMembers: true,
        activity: { orderBy: { createdAt: "desc" }, take: 3 }
      }
    });

    return NextResponse.json(members);
  } catch (error) {
    return respondToError(error);
  }
}

const createMemberSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  invitedById: z.string().optional()
});

export async function POST(request: Request) {
  try {
    const requester = await requireUser();
    const body = createMemberSchema.parse(await request.json());

    const canPlaceAnywhere = requester.role === "ADMIN" || requester.role === "MASTER" || requester.role === "PRESIDENT";
    const invitedById = canPlaceAnywhere && body.invitedById ? body.invitedById : requester.id;

    const member = await db.user.create({
      data: {
        name: body.name,
        email: body.email,
        role: "MEMBER",
        organisationId: requester.organisationId,
        invitedById,
        inviteCode: `YC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
      },
      include: { invitedBy: true, invitedMembers: true }
    });

    await db.activity.create({
      data: {
        userId: invitedById,
        action: "member_added_to_circle",
        metadata: { memberId: member.id, memberName: member.name }
      }
    });

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    return respondToError(error);
  }
}
