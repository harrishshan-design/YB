import { legacyGet, legacyPost } from "@/lib/product/legacy";
export async function GET(request: Request) {
  return legacyGet(request, "members");
}
export async function POST(request: Request) {
  return legacyPost(request, "members");
}
