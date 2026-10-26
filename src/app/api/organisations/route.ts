import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, respondToError } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireUser();

    const organisations =
      user.role === "MASTER"
        ? await db.organisation.findMany({
            where: { status: "ACTIVE" },
            orderBy: { name: "asc" },
            include: {
              _count: {
                select: {
                  users: true,
                  programmes: true,
                  assistanceCases: true,
                },
              },
            },
          })
        : await db.organisation.findMany({
            where: {
              status: "ACTIVE",
              OR: [
                { id: user.organisationId ?? "__none__" },
                {
                  memberships: { some: { userId: user.id, status: "ACTIVE" } },
                },
              ],
            },
            orderBy: { name: "asc" },
            include: {
              _count: {
                select: {
                  users: true,
                  programmes: true,
                  assistanceCases: true,
                },
              },
            },
          });

    return NextResponse.json(
      organisations.map((organisation) => ({
        id: organisation.id,
        name: organisation.name,
        description: organisation.description,
        inviteCode: organisation.inviteCode,
        memberCount: organisation._count.users,
        programmeCount: organisation._count.programmes,
        caseCount: organisation._count.assistanceCases,
      })),
    );
  } catch (error) {
    return respondToError(error);
  }
}
