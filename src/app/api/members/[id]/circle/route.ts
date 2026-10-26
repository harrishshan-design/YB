import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ApiError, requireUser, respondToError } from "@/lib/auth";
import {
  workspaceContext,
  readWorkspace,
  visibleWorkspace,
} from "@/lib/product/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const context = await workspaceContext(_request);
    const requester = context.user;
    const { id } = await params;

    const data = visibleWorkspace(await readWorkspace(context), requester.id);
    const member = data.members.find((m) => m.id === id);

    if (!member) {
      throw new ApiError(404, "Member not found");
    }

    return NextResponse.json({
      ...member,
      invitedMembers: data.members.filter((m) => m.invitedById === id),
    });
  } catch (error) {
    return respondToError(error);
  }
}
