import { createHmac, timingSafeEqual } from "node:crypto";
import { ApiError } from "@/lib/auth";
type Claims = {
  kind: "card" | "attendance";
  organisationId: string;
  id: string;
  expires: number;
};
function secret() {
  const key = process.env.YBNGO_SIGNING_SECRET;
  if (!key)
    throw new ApiError(
      503,
      "QR verification is being set up. Contact your organisation owner.",
    );
  return key;
}
export function signToken(claims: Claims) {
  const body = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return (
    body + "." + createHmac("sha256", secret()).update(body).digest("base64url")
  );
}
export function readToken(token: string, kind: Claims["kind"]): Claims {
  const [body, sig] = token.split(".");
  if (!body || !sig)
    throw new ApiError(400, "This verification link is invalid.");
  const expected = createHmac("sha256", secret()).update(body).digest();
  const actual = Buffer.from(sig, "base64url");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual))
    throw new ApiError(400, "This verification link is invalid.");
  let claims: Claims;
  try {
    claims = JSON.parse(Buffer.from(body, "base64url").toString());
  } catch {
    throw new ApiError(400, "This link is invalid.");
  }
  if (
    claims.kind !== kind ||
    !claims.id ||
    !claims.organisationId ||
    !Number.isFinite(claims.expires) ||
    claims.expires < Date.now()
  )
    throw new ApiError(400, "This link has expired. Ask for a new QR code.");
  return claims;
}
