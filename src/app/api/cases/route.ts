import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  requireUser,
  resolveOrganisationId,
  respondToError,
  selectedOrgScope,
} from "@/lib/auth";
import { workspaceContext } from "@/lib/product/server";
import { canManage } from "@/lib/product/types";

export async function GET(request: Request) {
  try {
    const context = await workspaceContext(request);
    const requester = context.user;
    const organisationId = context.organisationId;

    const cases = await db.caseComplaint.findMany({
      where: {
        ...selectedOrgScope(organisationId),
        ...(!canManage(context.role) ? { assignedToId: requester.id } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: { assignedTo: { select: { name: true } } },
    });

    return NextResponse.json(cases);
  } catch (error) {
    return respondToError(error);
  }
}

const createCaseSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const requester = await requireUser();
    const organisationId = await resolveOrganisationId(requester, request);
    const body = createCaseSchema.parse(await request.json());

    const created = await db.caseComplaint.create({
      data: {
        referenceNo: `CASE-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        title: body.title,
        description: body.description ?? "",
        organisationId,
        assignedToId: requester.id,
      },
      include: { assignedTo: true },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return respondToError(error);
  }
}
