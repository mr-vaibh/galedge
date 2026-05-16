"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePortfolio } from "@/lib/portfolio-context";
import { AnalyticsEmptyState } from "@/components/analytics/AnalyticsEmptyState";

export default function AnalyticsIndexPage() {
  const router = useRouter();
  const { analyticsData } = usePortfolio();

  useEffect(() => {
    if (analyticsData) {
      router.replace("/analytics/overview/performance");
    }
  }, [analyticsData, router]);

  return <AnalyticsEmptyState title="Analytics" />;
}
