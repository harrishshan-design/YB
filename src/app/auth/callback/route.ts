import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (code) {
    const client = await getSupabaseServerClient();
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/login", url.origin));
  }
  return NextResponse.redirect(
    new URL("/login?confirmation=failed", url.origin),
  );
}
