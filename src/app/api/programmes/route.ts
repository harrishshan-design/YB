import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orgScope, requireUser, respondToError } from "@/lib/auth";

export async function GET() {
  try {
    const requester = await requireUser();

    const programmes = await db.programme.findMany({
      where: orgScope(requester),
      orderBy: { createdAt: "desc" },
      take: 20
    });

    return NextResponse.json(programmes);
  } catch (error) {
    return respondToError(error);
  }
}
