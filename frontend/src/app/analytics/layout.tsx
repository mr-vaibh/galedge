export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full overflow-y-auto">
      {children}
    </div>
  );
}
