import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, respondToError } from "@/lib/auth";

export async function GET() {
  try {
    await requireUser();

    const programmes = await db.programme.findMany({
      orderBy: { createdAt: "desc" },
      take: 20
    });

    return NextResponse.json(programmes);
  } catch (error) {
    return respondToError(error);
  }
}
