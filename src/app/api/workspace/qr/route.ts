import { NextResponse } from "next/server";
import { ApiError, respondToError } from "@/lib/auth";
import { workspaceContext, readWorkspace } from "@/lib/product/server";
import { canProgramme, canManage } from "@/lib/product/types";
import { signToken } from "@/lib/product/tokens";
export async function GET(request: Request) {
  try {
    const c = await workspaceContext(request);
    const query = new URL(request.url).searchParams;
    const kind = query.get("kind");
    const id = query.get("id") ?? "";
    const data = await readWorkspace(c);
    if (data.subscription.plan === "COMMUNITY")
      throw new ApiError(
        403,
        "QR attendance and digital cards are available on Organisation.",
      );
    if (kind !== "card" && kind !== "attendance")
      throw new ApiError(400, "Choose a valid QR type.");
    if (
      kind === "attendance" &&
      (!canProgramme(c.role) || !data.programmes.some((p) => p.id === id))
    )
      throw new ApiError(
        403,
        "You cannot create an attendance code for this programme.",
      );
    if (
      kind === "card" &&
      (!data.members.some((m) => m.id === id) ||
        (id !== c.user.id && !canManage(c.role)))
    )
      throw new ApiError(403, "You can only open your own card.");
    const token = signToken({
      kind,
      organisationId: c.organisationId,
      id,
      expires: Date.now() + (kind === "card" ? 30 : 1) * 86400000,
    });
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
    return NextResponse.json({
      url:
        kind === "card"
          ? `${origin}/verify/${token}`
          : `${origin}/check-in?token=${encodeURIComponent(token)}`,
    });
  } catch (error) {
    return respondToError(error);
  }
}
