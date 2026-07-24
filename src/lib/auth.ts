import type { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
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
  const { data, error } = await supabase.auth.getUser();

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

export function respondToError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }

  if (error instanceof ZodError) {
    return NextResponse.json({ message: "Invalid request", issues: error.issues }, { status: 400 });
  }

  console.error(error);
  return NextResponse.json({ message: "Internal server error" }, { status: 500 });
}
