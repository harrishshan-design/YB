import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, respondToError } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const profileSchema = z.object({
  name: z.string().min(2),
  role: z.enum(["MEMBER", "PRESIDENT", "ADMIN", "MASTER"])
});

export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user?.email) {
      return NextResponse.json({ message: "Not logged in" }, { status: 401 });
    }

    const body = profileSchema.parse(await request.json());
    const existing = await db.user.findFirst({
      where: {
        OR: [{ authUserId: data.user.id }, { email: data.user.email.toLowerCase() }]
      }
    });

    if (existing) {
      const updated = await db.user.update({
        where: { id: existing.id },
        data: {
          authUserId: data.user.id,
          name: body.name,
          role: body.role,
          isActive: true
        }
      });

      return NextResponse.json({ user: updated });
    }

    const user = await db.user.create({
      data: {
        authUserId: data.user.id,
        name: body.name,
        email: data.user.email.toLowerCase(),
        role: body.role,
        inviteCode: `YB-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
      }
    });

    await db.activity.create({
      data: {
        userId: user.id,
        action: "account_signed_up",
        metadata: { role: body.role }
      }
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    return respondToError(error);
  }
}

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json({ user });
  } catch (error) {
    return respondToError(error);
  }
}
