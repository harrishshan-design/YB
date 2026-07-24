import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { respondToError } from "@/lib/auth";

// Public — used by the /join/[code] signup page to show the org's name before
// the visitor has an account. Only the name is exposed, nothing else.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code")?.trim();

    if (!code) {
      return NextResponse.json({ message: "Missing invite code" }, { status: 400 });
    }

    const organisation = await db.organisation.findUnique({
      where: { inviteCode: code },
      select: { name: true, status: true }
    });

    if (!organisation || organisation.status !== "ACTIVE") {
      return NextResponse.json({ message: "This invite link is invalid or has expired" }, { status: 404 });
    }

    return NextResponse.json({ name: organisation.name });
  } catch (error) {
    return respondToError(error);
  }
}
