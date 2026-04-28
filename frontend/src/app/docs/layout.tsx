import { DocsSidebar } from "@/components/DocsSidebar";

export const metadata = {
  title: "Documentation | Galedge",
  description: "Galedge platform documentation — guides, concepts, and API reference for systematic investing.",
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <DocsSidebar />
      <main className="lg:ml-64">
        <div className="max-w-4xl mx-auto px-6 py-12 lg:py-16">
          {children}
        </div>
      </main>
    </div>
  );
}
