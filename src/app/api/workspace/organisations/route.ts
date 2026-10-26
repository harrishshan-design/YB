import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, requireUser, respondToError } from "@/lib/auth";
import { workspaceContext, readWorkspace } from "@/lib/product/server";
import { canBill } from "@/lib/product/types";
const schema = z.object({
  action: z.enum(["create", "join", "branch"]),
  name: z.string().trim().min(2).max(200).optional(),
  inviteCode: z.string().max(100).optional(),
  description: z.string().max(5000).optional(),
  state: z.string().max(100).optional(),
  organisationType: z.string().max(100).optional(),
  registrationNo: z.string().max(100).optional(),
  email: z.string().max(200).optional(),
  phone: z.string().max(50).optional(),
  logo: z.string().max(400000).optional(),
  estimatedMembers: z.number().max(100000).optional(),
});
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = schema.parse(await request.json());
    if (body.action === "join") {
      const club = await db.organisation.findUnique({
        where: { inviteCode: body.inviteCode ?? "" },
      });
      if (!club || club.status !== "ACTIVE")
        throw new ApiError(404, "Invite not found.");
      const existing = await db.organisationMembership.findUnique({
        where: {
          organisationId_userId: { organisationId: club.id, userId: user.id },
        },
      });
      if (existing)
        throw new ApiError(
          400,
          "You already have a membership or application in this organisation.",
        );
      await db.organisationMembership.create({
        data: {
          organisationId: club.id,
          userId: user.id,
          role: "MEMBER",
          status: "PENDING",
          number: "YB-" + crypto.randomUUID().slice(0, 8).toUpperCase(),
        },
      });
      return NextResponse.json({
        id: club.id,
        message:
          "Membership requested. Your organisation owner will review it.",
      });
    }
    if (!body.name) throw new ApiError(400, "Enter your organisation name.");
    let parentId: string | undefined;
    if (body.action === "branch") {
      const c = await workspaceContext(request);
      const data = await readWorkspace(c);
      if (!canBill(c.role) || data.subscription.plan !== "NETWORK")
        throw new ApiError(
          403,
          "Branch management is available to owners on the Network plan.",
        );
      parentId = c.organisationId;
    }
    const club = await db.$transaction(async (tx) => {
      const organisation = await tx.organisation.create({
        data: {
          name: body.name!,
          description: body.description ?? "",
          parentId,
          inviteCode:
            "ORG-" +
            crypto.randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase(),
          contactEmail: body.email || user.email,
          registrationNo: body.registrationNo || null,
          createdBy: user.id,
          profile: {
            create: {
              phone: body.phone || null,
              logoUrl: body.logo || null,
              metadata: {
                state: body.state ?? "",
                type: body.organisationType ?? "Community organisation",
                estimatedMembers: body.estimatedMembers ?? 30,
              },
            },
          },
          memberships: {
            create: {
              userId: user.id,
              role: "OWNER",
              status: "ACTIVE",
              number: "YB-0001",
              createdBy: user.id,
            },
          },
        },
      });
      if (!parentId)
        await tx.subscription.create({
          data: {
            organisationId: organisation.id,
            plan: "PROFESSIONAL",
            status: "trialing",
            trialEnd: new Date(Date.now() + 14 * 86400000),
            currentPeriodEnd: new Date(Date.now() + 14 * 86400000),
            createdBy: user.id,
          },
        });
      await tx.auditLog.create({
        data: {
          organisationId: organisation.id,
          actorId: user.id,
          action: parentId ? "Branch created" : "Organisation created",
          entityType: "organisation",
          entityId: organisation.id,
        },
      });
      return organisation;
    });
    return NextResponse.json({ id: club.id }, { status: 201 });
  } catch (error) {
    return respondToError(error);
  }
}
export async function GET(request: Request) {
  try {
    const c = await workspaceContext(request);
    const data = await readWorkspace(c);
    if (!canBill(c.role) || data.subscription.plan !== "NETWORK")
      throw new ApiError(403, "Network owner access is required.");
    const organisations = await db.organisation.findMany({
      select: {
        id: true,
        name: true,
        parentId: true,
        status: true,
        _count: { select: { memberships: true, programmes: true } },
      },
    });
    const selected = new Set([c.organisationId]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const club of organisations)
        if (
          club.parentId &&
          selected.has(club.parentId) &&
          !selected.has(club.id)
        ) {
          selected.add(club.id);
          changed = true;
        }
    }
    return NextResponse.json(
      organisations
        .filter((o) => selected.has(o.id))
        .map((o) => ({
          id: o.id,
          name: o.name,
          parentId: o.parentId,
          status: o.status,
          members: o._count.memberships,
          programmes: o._count.programmes,
        })),
    );
  } catch (error) {
    return respondToError(error);
  }
}
