import { NextResponse } from "next/server";
import { respondToError } from "@/lib/auth";
import {
  workspaceContext,
  readWorkspace,
  visibleWorkspace,
  mutateWorkspace,
} from "@/lib/product/server";
export async function GET(request: Request) {
  try {
    const c = await workspaceContext(request);
    return NextResponse.json(
      visibleWorkspace(await readWorkspace(c), c.user.id),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return respondToError(error);
  }
}
export async function POST(request: Request) {
  try {
    const c = await workspaceContext(request);
    await mutateWorkspace(c, await request.json());
    return NextResponse.json(
      visibleWorkspace(await readWorkspace(c), c.user.id),
    );
  } catch (error) {
    return respondToError(error);
  }
}
