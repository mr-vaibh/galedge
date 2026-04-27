import { Suspense } from "react";
import BuildStrategyPageInner from "./_client";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <BuildStrategyPageInner />
    </Suspense>
  );
}
