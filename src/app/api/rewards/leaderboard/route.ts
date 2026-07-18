import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, respondToError } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    await requireUser();

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") ?? new Date().toISOString().slice(0, 7);

    const leaderboard = await db.reward.groupBy({
      by: ["userId"],
      where: { month },
      _sum: { points: true },
      orderBy: { _sum: { points: "desc" } },
      take: 10
    });

    const users = await db.user.findMany({ where: { id: { in: leaderboard.map((entry) => entry.userId) } } });
    const ranked = leaderboard.map((entry, index) => ({
      rank: index + 1,
      points: entry._sum.points ?? 0,
      user: users.find((user) => user.id === entry.userId)
    }));

    return NextResponse.json(ranked);
  } catch (error) {
    return respondToError(error);
  }
}
