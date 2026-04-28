import Link from "next/link";

export default function PortfolioDocsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Portfolio Management</h1>
      <p className="text-neutral-400 mb-10">Upload, select, and track your investment portfolios.</p>

      {/* Upload CSV */}
      <section id="upload-csv" className="mb-12">
        <h2 className="text-xl font-semibold mb-3">Upload Portfolio CSV</h2>
        <p className="text-neutral-400 mb-3 leading-relaxed">
          Navigate to <strong className="text-white">Portfolio Construction &rarr; Upload Portfolio</strong>. Upload a CSV file
          containing your stock holdings. The platform accepts the following format:
        </p>

        <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4 mb-4">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-neutral-500"><th className="pb-2">Column</th><th className="pb-2">Required</th><th className="pb-2">Format</th><th className="pb-2">Description</th></tr></thead>
            <tbody className="text-neutral-300">
              <tr className="border-t border-neutral-800"><td className="py-2 font-mono text-xs">Symbol</td><td className="py-2 text-emerald-400">Yes</td><td className="py-2">Yahoo Finance ticker</td><td className="py-2">Stock symbol (e.g., RELIANCE.NS, AAPL)</td></tr>
              <tr className="border-t border-neutral-800"><td className="py-2 font-mono text-xs">Shares</td><td className="py-2 text-emerald-400">Yes</td><td className="py-2">Number</td><td className="py-2">Number of shares held</td></tr>
              <tr className="border-t border-neutral-800"><td className="py-2 font-mono text-xs">BuyPrice</td><td className="py-2 text-emerald-400">Yes</td><td className="py-2">Number</td><td className="py-2">Price per share at purchase</td></tr>
              <tr className="border-t border-neutral-800"><td className="py-2 font-mono text-xs">BuyDate</td><td className="py-2 text-emerald-400">Yes</td><td className="py-2">YYYY-MM-DD</td><td className="py-2">Date of purchase</td></tr>
            </tbody>
          </table>
        </div>

        <h3 className="font-medium text-white mb-2">Symbol Format</h3>
        <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4 mb-4">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-neutral-500"><th className="pb-2">Market</th><th className="pb-2">Suffix</th><th className="pb-2">Example</th></tr></thead>
            <tbody className="text-neutral-300">
              <tr className="border-t border-neutral-800"><td className="py-2">NSE (India)</td><td className="py-2 font-mono text-xs">.NS</td><td className="py-2">RELIANCE.NS, TCS.NS</td></tr>
              <tr className="border-t border-neutral-800"><td className="py-2">BSE (India)</td><td className="py-2 font-mono text-xs">.BO</td><td className="py-2">RELIANCE.BO</td></tr>
              <tr className="border-t border-neutral-800"><td className="py-2">US</td><td className="py-2 font-mono text-xs">(none)</td><td className="py-2">AAPL, MSFT, GOOGL</td></tr>
            </tbody>
          </table>
        </div>

        <h3 className="font-medium text-white mb-2">Data Ingestion</h3>
        <p className="text-neutral-400 mb-3 leading-relaxed">
          After upload, the platform automatically fetches historical price data from Yahoo Finance for all symbols
          in your portfolio. This process runs in a background thread and typically takes <strong className="text-white">30-60 seconds</strong>.
        </p>
        <ul className="list-disc list-inside text-sm text-neutral-400 space-y-1">
          <li>A progress spinner shows while ingestion is running</li>
          <li>Once complete, the portfolio appears in the selection list</li>
          <li>Price data covers 2 years of daily OHLCV data</li>
          <li>If a symbol is invalid, the ingestion skips it and continues with the rest</li>
        </ul>
      </section>

      {/* Select Portfolio */}
      <section id="select-portfolio" className="mb-12">
        <h2 className="text-xl font-semibold mb-3">Select Portfolio</h2>
        <p className="text-neutral-400 mb-3 leading-relaxed">
          Navigate to <strong className="text-white">Portfolio Construction &rarr; Select Portfolio</strong>. Here you see
          all your uploaded portfolios. Click on one to set it as the <strong className="text-white">active portfolio</strong>.
        </p>
        <p className="text-neutral-400 mb-3 leading-relaxed">
          The active portfolio is used by:
        </p>
        <ul className="list-disc list-inside text-sm text-neutral-400 space-y-1">
          <li>All analytics pages (Performance, Holdings, Returns &amp; Risk, etc.)</li>
          <li>Risk model factor decomposition</li>
          <li>Strategy builder (as the starting portfolio)</li>
          <li>Optimizer (uses the portfolio&apos;s stock universe)</li>
        </ul>
        <p className="text-neutral-500 text-sm mt-3">
          The selection persists as you navigate between pages within the same session.
        </p>
      </section>

      {/* Portfolio Tracker */}
      <section id="tracker" className="mb-12">
        <h2 className="text-xl font-semibold mb-3">Portfolio Tracker</h2>
        <p className="text-neutral-400 mb-3 leading-relaxed">
          The <strong className="text-white">Portfolio Tracker</strong> (in the Tools section) is a simpler, standalone tool
          for tracking stock holdings and P&amp;L without the full analytics suite.
        </p>

        <h3 className="font-medium text-white mb-2">Adding Holdings</h3>
        <p className="text-neutral-400 mb-3 leading-relaxed">
          Fill in the form at the top of the page:
        </p>
        <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4 mb-4">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-neutral-500"><th className="pb-2">Field</th><th className="pb-2">Description</th><th className="pb-2">Example</th></tr></thead>
            <tbody className="text-neutral-300">
              <tr className="border-t border-neutral-800"><td className="py-2">Symbol</td><td className="py-2">Stock ticker</td><td className="py-2">AAPL</td></tr>
              <tr className="border-t border-neutral-800"><td className="py-2">Shares</td><td className="py-2">Quantity held</td><td className="py-2">50</td></tr>
              <tr className="border-t border-neutral-800"><td className="py-2">Buy Price</td><td className="py-2">Purchase price per share</td><td className="py-2">175.00</td></tr>
              <tr className="border-t border-neutral-800"><td className="py-2">Buy Date</td><td className="py-2">Purchase date</td><td className="py-2">2024-06-15</td></tr>
            </tbody>
          </table>
        </div>

        <h3 className="font-medium text-white mb-2">What You See</h3>
        <ul className="list-disc list-inside text-sm text-neutral-400 space-y-1 mb-4">
          <li><strong className="text-white">Holdings table</strong> &mdash; symbol, shares, buy price, current price, invested amount, current value, P&amp;L, P&amp;L %</li>
          <li><strong className="text-white">Summary cards</strong> &mdash; Total Invested, Current Value, Total P&amp;L, Overall Return %</li>
          <li><strong className="text-white">CSV export</strong> &mdash; download your holdings as a spreadsheet</li>
        </ul>
        <p className="text-neutral-500 text-sm">
          Holdings are saved in your browser&apos;s local storage — they persist between page refreshes but are not synced to the server.
          Currency conversion between USD and INR is automatic based on your <Link href="/docs/settings" className="text-emerald-400 hover:underline">currency setting</Link>.
        </p>
      </section>
    </div>
  );
}
