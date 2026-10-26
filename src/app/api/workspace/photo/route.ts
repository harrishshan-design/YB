import { NextResponse } from "next/server";
import { ApiError, respondToError } from "@/lib/auth";
import { workspaceContext } from "@/lib/product/server";
import { db } from "@/lib/db";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
export async function GET(request: Request) {
  try {
    const c = await workspaceContext(request);
    const key = new URL(request.url).searchParams.get("key") ?? "";
    const doc = await db.document.findFirst({
      where: {
        organisationId: c.organisationId,
        storageKey: key,
        status: "ACTIVE",
        ownerType: "Programme photos",
      },
    });
    if (!doc) throw new ApiError(404, "Photo not found.");
    const { data, error } = await getSupabaseAdminClient()
      .storage.from(process.env.SUPABASE_STORAGE_BUCKET ?? "documents")
      .createSignedUrl(key, 60);
    if (error) throw new ApiError(503, "Photo unavailable.");
    return NextResponse.redirect(data.signedUrl);
  } catch (error) {
    return respondToError(error);
  }
}
