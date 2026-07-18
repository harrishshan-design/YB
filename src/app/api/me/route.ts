import { NextResponse } from "next/server";
import { requireUser, respondToError } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json({ user });
  } catch (error) {
    return respondToError(error);
  }
}
