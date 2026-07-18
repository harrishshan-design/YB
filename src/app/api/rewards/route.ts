import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole, respondToError } from "@/lib/auth";

const createRewardSchema = z.object({
  userId: z.string(),
  points: z.number().int().positive(),
  reason: z.string().min(3),
  month: z.string().regex(/^\d{4}-\d{2}$/)
});

export async function POST(request: Request) {
  try {
    const requester = await requireRole(["PRESIDENT", "ADMIN", "MASTER"]);
    const body = createRewardSchema.parse(await request.json());

    const reward = await db.$transaction(async (tx) => {
      const created = await tx.reward.create({ data: body });
      await tx.user.update({ where: { id: body.userId }, data: { points: { increment: body.points } } });
      await tx.activity.create({
        data: {
          userId: requester.id,
          action: "points_awarded",
          metadata: { toUserId: body.userId, points: body.points, reason: body.reason }
        }
      });
      return created;
    });

    return NextResponse.json(reward, { status: 201 });
  } catch (error) {
    return respondToError(error);
  }
}
