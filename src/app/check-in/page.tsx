import { Suspense } from "react";
import { CheckIn } from "@/components/product/PublicVerification";
export default function CheckInPage() {
  return (
    <Suspense>
      <CheckIn />
    </Suspense>
  );
}
