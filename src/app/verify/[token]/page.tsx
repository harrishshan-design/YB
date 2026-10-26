import { Suspense } from "react";
import { Verification } from "@/components/product/PublicVerification";
export default async function VerifyPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  return (
    <Suspense>
      <Verification token={(await params).token} />
    </Suspense>
  );
}
