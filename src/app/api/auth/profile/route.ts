import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { db } from "@/lib/db";
import { respondToError } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Role } from "@prisma/client";

const profileSchema = z.object({
  name: z.string().min(2),
  role: z.enum(["MEMBER", "PRESIDENT", "ADMIN", "MASTER"])
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

async function findOrCreateProfile({
  authUserId,
  email,
  name,
  role
}: {
  authUserId: string;
  email: string;
  name: string;
  role: Role;
}) {
  const existing = await db.user.findFirst({
    where: {
      OR: [{ authUserId }, { email: email.toLowerCase() }]
    }
  });

  if (existing) {
    const updated = await db.user.update({
      where: { id: existing.id },
      data: {
        authUserId,
        name: existing.name || name,
        role: existing.role ?? role,
        isActive: true
      }
    });

    return updated;
  }

  const user = await db.user.create({
    data: {
      authUserId,
      name,
      email: email.toLowerCase(),
      role,
      inviteCode: `YB-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    }
  });

  await db.activity.create({
    data: {
      userId: user.id,
      action: "account_signed_up",
      metadata: { role }
    }
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
      role: body.role
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

    const user = await findOrCreateProfile({
      authUserId: authUser.id,
      email: authUser.email,
      name,
      role
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    return respondToError(error);
  }
}
