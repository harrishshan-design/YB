import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ApiError, respondToError } from "@/lib/auth";
import { workspaceContext } from "@/lib/product/server";

export async function GET(request: Request) {
  try {
    const context = await workspaceContext(request);
    if (context.membership?.status === "PENDING")
      throw new ApiError(403, "Your membership is awaiting approval.");

    const { searchParams } = new URL(request.url);
    const month =
      searchParams.get("month") ?? new Date().toISOString().slice(0, 7);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))
      throw new ApiError(400, "Choose a valid month.");

    const leaderboard = await db.reward.groupBy({
      by: ["userId"],
      where: {
        month,
        user: {
          organisationId: context.organisationId,
          isActive: true,
          OR: [
            {
              organisationMemberships: {
                none: { organisationId: context.organisationId },
              },
            },
            {
              organisationMemberships: {
                some: {
                  organisationId: context.organisationId,
                  status: "ACTIVE",
                },
              },
            },
          ],
        },
      },
      _sum: { points: true },
      orderBy: { _sum: { points: "desc" } },
      take: 10,
    });

    const users = await db.user.findMany({
      where: { id: { in: leaderboard.map((entry) => entry.userId) } },
      select: { id: true, name: true },
    });
    const ranked = leaderboard.map((entry, index) => ({
      rank: index + 1,
      points: entry._sum.points ?? 0,
      user: users.find((user) => user.id === entry.userId),
    }));

    return NextResponse.json(ranked);
  } catch (error) {
    return respondToError(error);
  }
}
