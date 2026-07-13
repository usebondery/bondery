import { Suspense } from "react";
import { UnavailableClient } from "./UnavailableClient";

export default function UnavailablePage() {
  return (
    <Suspense fallback={null}>
      <UnavailableClient />
    </Suspense>
  );
}
