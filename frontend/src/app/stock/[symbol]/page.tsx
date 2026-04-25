import type { Metadata } from "next";
import { QuoteHeader } from "@/components/QuoteHeader";
import { PriceChart } from "@/components/PriceChart";
import { Tabs } from "@/components/Tabs";
import { FundamentalsTab } from "@/components/FundamentalsTab";
import { OptionsTab } from "@/components/OptionsTab";
import { IntelTab } from "@/components/IntelTab";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ symbol: string }>;
}): Promise<Metadata> {
  const { symbol } = await params;
  const sym = symbol.toUpperCase();
  return {
    title: `${sym} Stock Price, Chart & Fundamentals`,
    description: `View ${sym} real-time stock price, interactive chart with technical indicators, options chain, fundamentals, insider trades, and analyst ratings on Galedge.`,
    openGraph: {
      title: `${sym} — Stock Price & Analysis | Galedge`,
      description: `Real-time ${sym} stock data: price chart, technical indicators, options, fundamentals, insider trades, and analyst ratings.`,
    },
  };
}

export default async function StockPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const sym = symbol.toUpperCase();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FinancialProduct",
    name: `${sym} Stock`,
    url: `https://galedge.byvaibhav.com/stock/${sym}`,
    description: `Real-time stock data for ${sym} including price, chart, options, fundamentals, and market intelligence.`,
    provider: {
      "@type": "Organization",
      name: "Galedge",
      url: "https://galedge.byvaibhav.com",
    },
  };

  return (
    <div className="max-w-7xl mx-auto px-4 pb-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
