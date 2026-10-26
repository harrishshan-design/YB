import type { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Resolves the caller's Supabase session to the matching app profile row, or throws 401. */
export async function requireUser() {
  const supabase = await getSupabaseServerClient();
  const bearer = (await headers()).get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  const { data, error } = await supabase.auth.getUser(bearer || undefined);

  if (error || !data.user) {
    throw new ApiError(401, "Not logged in");
  }

  const appUser = await db.user.findUnique({ where: { authUserId: data.user.id } });

  if (!appUser || !appUser.isActive) {
    throw new ApiError(401, "No matching account");
  }

  return appUser;
}

/** Same as requireUser, but also throws 403 if the caller's role isn't in the allow list. */
export async function requireRole(roles: Role[]) {
  const user = await requireUser();

  if (!roles.includes(user.role)) {
    throw new ApiError(403, "You do not have permission to do this");
  }

  return user;
}

/**
 * MASTER sees across every organisation; everyone else is scoped to their own.
 * Spread the result into a Prisma `where` clause: `{ ...orgScope(user), ... }`.
 * A non-MASTER user with no organisation (shouldn't normally happen) is scoped
 * to a value that matches nothing, rather than accidentally returning everything.
 */
export function orgScope(user: { role: Role; organisationId: string | null }) {
  if (user.role === "MASTER") return {};
  return { organisationId: user.organisationId ?? "__none__" };
}

export async function resolveOrganisationId(user: { id: string; role: Role; organisationId: string | null }, request: Request) {
  const requestedId = new URL(request.url).searchParams.get("organisationId");

  if (!requestedId) {
    return user.organisationId;
  }

  if (user.role === "MASTER") {
    return requestedId;
  }

  const membership = await db.organisationMembership.findFirst({
    where: {
      userId: user.id,
      organisationId: requestedId,
      status: "ACTIVE"
    }
  });

  if (membership || requestedId === user.organisationId) {
    return requestedId;
  }

  throw new ApiError(403, "You do not have access to this club");
}

export function selectedOrgScope(organisationId: string | null) {
  return { organisationId: organisationId ?? "__none__" };
}

export function respondToError(error: unknown) {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return NextResponse.json({message:"You are signed in, but the organisation database is unavailable. Please contact support."},{status:503});
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return NextResponse.json({message:"This record already exists in your organisation."},{status:409});
  }
  if (error instanceof ApiError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }

  if (error instanceof ZodError) {
    return NextResponse.json({ message: error.issues[0]?.message ?? "Invalid request", issues: error.issues }, { status: 400 });
  }

  console.error(error);
  return NextResponse.json({ message: "Internal server error" }, { status: 500 });
}
