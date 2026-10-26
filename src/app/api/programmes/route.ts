import { legacyGet } from "@/lib/product/legacy";
export async function GET(request: Request) {
  return legacyGet(request, "programmes");
}
