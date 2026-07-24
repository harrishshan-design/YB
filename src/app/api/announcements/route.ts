import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { orgScope, requireRole, requireUser, respondToError } from "@/lib/auth";

export async function GET() {
  try {
    const requester = await requireUser();

    const announcements = await db.announcement.findMany({
      where: orgScope(requester),
      orderBy: { createdAt: "desc" },
      include: { createdBy: true, approval: true }
    });

    return NextResponse.json(announcements);
  } catch (error) {
    return respondToError(error);
  }
}

const createAnnouncementSchema = z.object({
  title: z.string().min(3),
  content: z.string().min(10),
  category: z.enum(["EVENTS", "URGENT", "OPPORTUNITIES"]),
  publishNow: z.boolean().default(false)
});

export async function POST(request: Request) {
  try {
    const requester = await requireRole(["PRESIDENT", "ADMIN", "MASTER"]);
    const body = createAnnouncementSchema.parse(await request.json());

    const announcement = await db.announcement.create({
      data: {
        title: body.title,
        content: body.content,
        category: body.category,
        createdById: requester.id,
        organisationId: requester.organisationId,
        publishedAt: body.publishNow ? new Date() : null,
        approval: { create: { type: "announcement", status: body.publishNow ? "APPROVED" : "PENDING" } }
      },
      include: { createdBy: true, approval: true }
    });

    return NextResponse.json(announcement, { status: 201 });
  } catch (error) {
    return respondToError(error);
  }
}
