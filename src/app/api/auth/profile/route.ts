import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, respondToError } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";
const inputSchema = z.object({
  name: z.string().trim().min(2).max(150),
  role: z.enum(["MEMBER", "PRESIDENT", "ADMIN"]).default("MEMBER"),
  organisationName: z.string().trim().min(2).max(200).optional(),
  organisationDescription: z.string().max(5000).optional(),
  inviteCode: z.string().max(200).optional(),
  registrationNo: z.string().max(100).optional(),
  organisationType: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  phone: z.string().max(50).optional(),
  contactEmail: z.string().max(200).optional(),
  estimatedMembers: z.number().max(100000).optional(),
  logo: z.string().max(400000).optional(),
});
async function resolveProfile(request: Request, explicit?: unknown) {
  const client = await getSupabaseServerClient();
  const bearer = (await headers())
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "")
    .trim();
  const { data, error } = await client.auth.getUser(bearer || undefined);
  if (error || !data.user?.email)
    throw new ApiError(401, "Please log in to continue.");
  const auth = data.user;
  const email = auth.email!.toLowerCase();
  const existing = await db.user.findFirst({
    where: { OR: [{ authUserId: auth.id }, { email }] },
  });
  if (existing) {
    if (!existing.isActive)
      throw new ApiError(
        403,
        "Your account is inactive. Contact your organisation owner.",
      );
    if (existing.authUserId && existing.authUserId !== auth.id)
      throw new ApiError(403, "This email is linked to another account.");
    return existing.authUserId
      ? existing
      : db.user.update({
          where: { id: existing.id },
          data: { authUserId: auth.id },
        });
  }
  const source = explicit ?? auth.user_metadata;
  const parsed = inputSchema.safeParse(source);
  if (!parsed.success)
    throw new ApiError(
      400,
      "Complete your organisation registration to set up your workspace.",
    );
  const input = parsed.data;
  // Signup metadata may describe a new organisation, but never grants staff access to an existing one.
  return db.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${auth.id}))`;
      const duplicate = await tx.user.findUnique({
        where: { authUserId: auth.id },
      });
      if (duplicate) return duplicate;
      if (input.organisationName) {
        const club = await tx.organisation.create({
          data: {
            name: input.organisationName,
            description: input.organisationDescription ?? null,
            inviteCode:
              "ORG-" +
              crypto
                .randomUUID()
                .replaceAll("-", "")
                .slice(0, 16)
                .toUpperCase(),
            registrationNo: input.registrationNo || null,
            contactEmail: input.contactEmail || email,
            profile: {
              create: {
                phone: input.phone || null,
                logoUrl: input.logo || null,
                metadata: {
                  state: input.state ?? "",
                  type: input.organisationType ?? "",
                  estimatedMembers: input.estimatedMembers ?? 30,
                },
              },
            },
          },
        });
        const user = await tx.user.create({
          data: {
            authUserId: auth.id,
            name: input.name,
            email,
            role: "PRESIDENT",
            organisationId: club.id,
            organisationMemberships: {
              create: {
                organisationId: club.id,
                role: "OWNER",
                status: "ACTIVE",
                number: "YB-0001",
              },
            },
          },
        });
        await tx.organisation.update({
          where: { id: club.id },
          data: { createdBy: user.id },
        });
        await tx.subscription.create({
          data: {
            organisationId: club.id,
            plan: "PROFESSIONAL",
            status: "trialing",
            trialEnd: new Date(Date.now() + 14 * 86400000),
            currentPeriodEnd: new Date(Date.now() + 14 * 86400000),
            createdBy: user.id,
          },
        });
        await tx.auditLog.create({
          data: {
            organisationId: club.id,
            actorId: user.id,
            action: "Organisation created",
            entityType: "organisation",
            entityId: club.id,
          },
        });
        return user;
      }
      if (!input.inviteCode)
        throw new ApiError(
          400,
          "Use your organisation's invite link, or create a new organisation.",
        );
      const club = await tx.organisation.findUnique({
        where: { inviteCode: input.inviteCode },
      });
      if (!club || club.status !== "ACTIVE")
        throw new ApiError(
          404,
          "This invite is not valid. Ask your organisation owner for a new link.",
        );
      const user = await tx.user.create({
        data: {
          authUserId: auth.id,
          name: input.name,
          email,
          role: "MEMBER",
          organisationId: club.id,
          organisationMemberships: {
            create: {
              organisationId: club.id,
              role: "MEMBER",
              status: "PENDING",
              number: "YB-" + crypto.randomUUID().slice(0, 8).toUpperCase(),
            },
          },
        },
      });
      await tx.auditLog.create({
        data: {
          organisationId: club.id,
          actorId: user.id,
          action: "Membership requested",
          entityType: "user",
          entityId: user.id,
        },
      });
      return user;
    },
    { timeout: 20000 },
  );
}
export async function GET(request: Request) {
  try {
    return NextResponse.json(
      { user: await resolveProfile(request) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return respondToError(error);
  }
}
export async function POST(request: Request) {
  try {
    return NextResponse.json({
      user: await resolveProfile(request, await request.json()),
    });
  } catch (error) {
    return respondToError(error);
  }
}
