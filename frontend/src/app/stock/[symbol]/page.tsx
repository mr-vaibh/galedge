import { QuoteHeader } from "@/components/QuoteHeader";
import { PriceChart } from "@/components/PriceChart";
import { Tabs } from "@/components/Tabs";
import { FundamentalsTab } from "@/components/FundamentalsTab";
import { OptionsTab } from "@/components/OptionsTab";
import { IntelTab } from "@/components/IntelTab";

export default async function StockPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const sym = symbol.toUpperCase();

  return (
    <div className="max-w-7xl mx-auto px-4 pb-12">
      <QuoteHeader symbol={sym} />
      <div className="mb-8">
        <PriceChart symbol={sym} />
      </div>
      <Tabs
        tabs={[
          {
            id: "fundamentals",
            label: "Fundamentals",
            content: <FundamentalsTab symbol={sym} />,
          },
          {
            id: "options",
            label: "Options",
            content: <OptionsTab symbol={sym} />,
          },
          {
            id: "intel",
            label: "Intel",
            content: <IntelTab symbol={sym} />,
          },
        ]}
      />
    </div>
  );
}
