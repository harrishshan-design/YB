import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { orgScope, requireUser, respondToError } from "@/lib/auth";

export async function GET() {
  try {
    const requester = await requireUser();

    const cases = await db.caseComplaint.findMany({
      where: orgScope(requester),
      orderBy: { createdAt: "desc" },
      include: { assignedTo: true }
    });

    return NextResponse.json(cases);
  } catch (error) {
    return respondToError(error);
  }
}

const createCaseSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional()
});

export async function POST(request: Request) {
  try {
    const requester = await requireUser();
    const body = createCaseSchema.parse(await request.json());

    const created = await db.caseComplaint.create({
      data: {
        referenceNo: `CASE-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        title: body.title,
        description: body.description ?? "",
        organisationId: requester.organisationId,
        assignedToId: requester.id
      },
      include: { assignedTo: true }
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return respondToError(error);
  }
}
