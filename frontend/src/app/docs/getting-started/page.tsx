import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Getting Started | Galedge Docs",
  description: "Get up and running with Galedge in minutes — create an account, upload your portfolio via CSV, and run your first NSE backtest with systematic investing tools.",
  keywords: ["systematic investing", "portfolio upload", "NSE backtest", "getting started", "Galedge setup"],
  openGraph: {
    title: "Getting Started | Galedge Docs",
    description: "Get up and running with Galedge in minutes — create an account, upload your portfolio via CSV, and run your first NSE backtest with systematic investing tools.",
  },
};

export default function GettingStartedPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Getting Started</h1>
      <p className="text-neutral-400 mb-8">Go from zero to your first analytics in under 5 minutes.</p>

      {/* Step 1 */}
      <section id="create-account" className="mb-12">
        <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 text-sm flex items-center justify-center font-bold">1</span>
          Create an Account
        </h2>
        <p className="text-neutral-400 mb-3 leading-relaxed">
          Navigate to the <Link href="/register" className="text-emerald-400 hover:underline">registration page</Link> and fill in your details:
        </p>
        <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4 mb-3">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-neutral-500"><th className="pb-2">Field</th><th className="pb-2">Description</th><th className="pb-2">Example</th></tr></thead>
            <tbody className="text-neutral-300">
              <tr className="border-t border-neutral-800"><td className="py-2 font-mono text-xs">Full Name</td><td className="py-2">Your display name</td><td className="py-2 text-neutral-500">Jane Doe</td></tr>
              <tr className="border-t border-neutral-800"><td className="py-2 font-mono text-xs">Email</td><td className="py-2">Login email address</td><td className="py-2 text-neutral-500">jane@example.com</td></tr>
              <tr className="border-t border-neutral-800"><td className="py-2 font-mono text-xs">Password</td><td className="py-2">A strong password</td><td className="py-2 text-neutral-500">********</td></tr>
              <tr className="border-t border-neutral-800"><td className="py-2 font-mono text-xs">Organization</td><td className="py-2">Your company or fund name</td><td className="py-2 text-neutral-500">Acme Capital</td></tr>
            </tbody>
          </table>
        </div>
        <p className="text-neutral-500 text-sm">After registration, you are automatically logged in and redirected to the home page.</p>
      </section>

      {/* Step 2 */}
      <section id="upload-portfolio" className="mb-12">
        <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 text-sm flex items-center justify-center font-bold">2</span>
          Upload Your Portfolio
        </h2>
        <p className="text-neutral-400 mb-3 leading-relaxed">
          Go to <strong className="text-white">Portfolio Construction &rarr; Upload Portfolio</strong> and upload a CSV file with your holdings.
        </p>
        <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4 mb-3">
          <p className="text-xs text-neutral-500 mb-2 font-medium">Required CSV format:</p>
          <pre className="text-xs text-neutral-300 font-mono overflow-x-auto">
{`Symbol,Shares,BuyPrice,BuyDate
RELIANCE.NS,100,2450.50,2024-01-15
TCS.NS,50,3800.00,2024-02-01
HDFCBANK.NS,200,1650.75,2024-01-20
INFY.NS,150,1480.00,2024-03-05`}
          </pre>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-3">
          <p className="text-sm text-amber-400">
            <strong>Note:</strong> After upload, the platform ingests market data for all symbols in the background.
            This typically takes 30-60 seconds for a new portfolio. You will see a progress indicator.
          </p>
        </div>
        <ul className="list-disc list-inside text-sm text-neutral-400 space-y-1">
          <li>Use Yahoo Finance symbol format (e.g., <code className="text-emerald-400 text-xs">RELIANCE.NS</code> for NSE, <code className="text-emerald-400 text-xs">AAPL</code> for US)</li>
          <li>BuyDate should be in <code className="text-emerald-400 text-xs">YYYY-MM-DD</code> format</li>
          <li>BuyPrice is the price per share at purchase</li>
        </ul>
      </section>

      {/* Step 3 */}
      <section id="select-portfolio" className="mb-12">
        <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 text-sm flex items-center justify-center font-bold">3</span>
          Select Your Portfolio
        </h2>
        <p className="text-neutral-400 mb-3 leading-relaxed">
          Go to <strong className="text-white">Portfolio Construction &rarr; Select Portfolio</strong> and choose the portfolio
          you just uploaded. This sets it as the active portfolio for all analytics and strategy pages.
        </p>
        <p className="text-neutral-500 text-sm">
          You can switch between portfolios at any time. The selected portfolio persists across page navigation.
        </p>
      </section>

      {/* Step 4 */}
      <section id="view-analytics" className="mb-12">
        <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 text-sm flex items-center justify-center font-bold">4</span>
          View Analytics
        </h2>
        <p className="text-neutral-400 mb-3 leading-relaxed">
          Navigate to <strong className="text-white">Analytics &rarr; Performance</strong> to see your portfolio analytics:
        </p>
        <ul className="list-disc list-inside text-sm text-neutral-400 space-y-1 mb-4">
          <li><strong className="text-white">Total Return</strong> &mdash; cumulative return since inception</li>
          <li><strong className="text-white">CAGR</strong> &mdash; compound annual growth rate</li>
          <li><strong className="text-white">Sharpe Ratio</strong> &mdash; risk-adjusted return</li>
          <li><strong className="text-white">Max Drawdown</strong> &mdash; largest peak-to-trough decline</li>
          <li><strong className="text-white">Equity Curve</strong> &mdash; portfolio value over time</li>
        </ul>
        <p className="text-neutral-500 text-sm">
          Explore the other analytics tabs (Holdings, Returns &amp; Risk, Peer Comparison) to dive deeper.
          See the <Link href="/docs/analytics" className="text-emerald-400 hover:underline">Analytics guide</Link> for details on every view.
        </p>
      </section>

      {/* Next steps */}
      <section className="bg-neutral-900/50 rounded-xl border border-neutral-800 p-6">
        <h3 className="font-semibold mb-3">What&apos;s Next?</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link href="/docs/optimizer" className="text-sm text-emerald-400 hover:underline">&rarr; Optimize your portfolio</Link>
          <Link href="/docs/strategy-builder" className="text-sm text-emerald-400 hover:underline">&rarr; Build and backtest strategies</Link>
          <Link href="/docs/risk-model" className="text-sm text-emerald-400 hover:underline">&rarr; Understand factor risk</Link>
          <Link href="/docs/tools" className="text-sm text-emerald-400 hover:underline">&rarr; Screen and compare stocks</Link>
        </div>
      </section>
    </div>
  );
}
