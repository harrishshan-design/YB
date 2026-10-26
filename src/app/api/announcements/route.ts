import { legacyGet, legacyPost } from "@/lib/product/legacy";
export async function GET(request: Request) {
  return legacyGet(request, "announcements");
}
export async function POST(request: Request) {
  return legacyPost(request, "announcements");
}
