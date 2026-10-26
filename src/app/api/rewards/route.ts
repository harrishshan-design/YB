import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, respondToError } from "@/lib/auth";
import { workspaceContext } from "@/lib/product/server";
import { canManage } from "@/lib/product/types";

const createRewardSchema = z.object({
  userId: z.string(),
  points: z.number().int().positive(),
  reason: z.string().min(3),
  month: z.string().regex(/^\d{4}-\d{2}$/),
});

export async function POST(request: Request) {
  try {
    const context = await workspaceContext(request);
    const requester = context.user;
    if (!canManage(context.role) || context.membership?.status === "PENDING")
      throw new ApiError(403, "Organisation admin access is required.");
    const body = createRewardSchema.parse(await request.json());

    const recipient = await db.user.findFirst({
      where: {
        id: body.userId,
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
    });
    if (!recipient) {
      throw new ApiError(404, "Member not found");
    }

    const reward = await db.$transaction(async (tx) => {
      const created = await tx.reward.create({ data: body });
      await tx.user.update({
        where: { id: body.userId },
        data: { points: { increment: body.points } },
      });
      await tx.activity.create({
        data: {
          userId: requester.id,
          action: "points_awarded",
          metadata: {
            toUserId: body.userId,
            points: body.points,
            reason: body.reason,
          },
        },
      });
      return created;
    });

    return NextResponse.json(reward, { status: 201 });
  } catch (error) {
    return respondToError(error);
  }
}
