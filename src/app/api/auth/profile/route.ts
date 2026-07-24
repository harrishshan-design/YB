import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, respondToError } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Role } from "@prisma/client";

// MASTER is intentionally excluded — it's a platform-wide role that must be
// provisioned by hand (e.g. directly in the database), never self-registered.
const profileSchema = z.object({
  name: z.string().min(2),
  role: z.enum(["MEMBER", "PRESIDENT", "ADMIN"]),
  organisationName: z.string().min(2).optional(),
  organisationDescription: z.string().optional(),
  inviteCode: z.string().min(3).optional()
});

async function getSupabaseUser(request: Request) {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();

  if (bearer) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return null;

    const tokenClient = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    const { data, error } = await tokenClient.auth.getUser(bearer);
    if (!error && data.user?.email) return data.user;
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.email) return null;

  return data.user;
}

function generateInviteCode() {
  return `ORG-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
}

async function findOrCreateProfile({
  authUserId,
  email,
  name,
  role,
  organisationName,
  organisationDescription,
  inviteCode
}: {
  authUserId: string;
  email: string;
  name: string;
  role: Role;
  organisationName?: string;
  organisationDescription?: string;
  inviteCode?: string;
}) {
  const existing = await db.user.findFirst({
    where: { OR: [{ authUserId }, { email: email.toLowerCase() }] }
  });

  if (existing) {
    return db.user.update({
      where: { id: existing.id },
      data: {
        authUserId,
        name: existing.name || name,
        role: existing.role ?? role,
        isActive: true
      }
    });
  }

  let organisationId: string;

  if (role === "PRESIDENT") {
    if (!organisationName) {
      throw new ApiError(400, "Organisation name is required to sign up as President");
    }

    const organisation = await db.organisation.create({
      data: {
        name: organisationName,
        description: organisationDescription || null,
        inviteCode: generateInviteCode()
      }
    });
    organisationId = organisation.id;
  } else {
    if (!inviteCode) {
      throw new ApiError(400, "An invite link is required to join an organisation");
    }

    const organisation = await db.organisation.findUnique({ where: { inviteCode } });
    if (!organisation) {
      throw new ApiError(404, "This invite link is invalid or has expired");
    }
    organisationId = organisation.id;
  }

  const user = await db.user.create({
    data: {
      authUserId,
      name,
      email: email.toLowerCase(),
      role,
      organisationId,
      inviteCode: `YB-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    }
  });

  if (role === "PRESIDENT") {
    await db.organisation.update({ where: { id: organisationId }, data: { createdBy: user.id } });
  }

  await db.activity.create({
    data: { userId: user.id, action: "account_signed_up", metadata: { role, organisationId } }
  });

  return user;
}

export async function POST(request: Request) {
  try {
    const authUser = await getSupabaseUser(request);

    if (!authUser?.email) {
      return NextResponse.json({ message: "Not logged in" }, { status: 401 });
    }

    const body = profileSchema.parse(await request.json());
    const user = await findOrCreateProfile({
      authUserId: authUser.id,
      email: authUser.email,
      name: body.name,
      role: body.role,
      organisationName: body.organisationName,
      organisationDescription: body.organisationDescription,
      inviteCode: body.inviteCode
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    return respondToError(error);
  }
}

export async function GET(request: Request) {
  try {
    const authUser = await getSupabaseUser(request);

    if (!authUser?.email) {
      return NextResponse.json({ message: "Not logged in" }, { status: 401 });
    }

    const metadata = authUser.user_metadata ?? {};
    const parsedRole = profileSchema.shape.role.safeParse(metadata.role);
    const role = parsedRole.success ? parsedRole.data : "MEMBER";
    const name = typeof metadata.name === "string" && metadata.name.length > 1 ? metadata.name : authUser.email.split("@")[0];
    const organisationName = typeof metadata.organisationName === "string" ? metadata.organisationName : undefined;
    const organisationDescription = typeof metadata.organisationDescription === "string" ? metadata.organisationDescription : undefined;
    const inviteCode = typeof metadata.inviteCode === "string" ? metadata.inviteCode : undefined;

    const user = await findOrCreateProfile({
      authUserId: authUser.id,
      email: authUser.email,
      name,
      role,
      organisationName,
      organisationDescription,
      inviteCode
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    return respondToError(error);
  }
}
