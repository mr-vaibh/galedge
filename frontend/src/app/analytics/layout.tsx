import { AnalyticsSidebar } from "@/components/AnalyticsSidebar";

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full" style={{ height: "calc(100vh - 48px)" }}>
      {/* Analytics sidebar — fixed 280px */}
      <div className="w-[280px] shrink-0 overflow-hidden">
        <AnalyticsSidebar />
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
