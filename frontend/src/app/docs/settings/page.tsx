import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings | Galedge Docs",
  description: "Configure your Galedge platform preferences — display currency, benchmark index, notification settings, and account management options.",
  keywords: ["settings", "display currency", "benchmark", "platform configuration", "account management"],
  openGraph: {
    title: "Settings | Galedge Docs",
    description: "Configure your Galedge platform preferences — display currency, benchmark index, notification settings, and account management options.",
  },
};

export default function SettingsDocsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Settings</h1>
      <p className="text-neutral-400 mb-10">Configure your platform preferences.</p>

      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-3">Display Currency</h2>
        <p className="text-neutral-400 mb-3 leading-relaxed">
          Navigate to <strong className="text-white">Settings</strong> in the sidebar. You can switch between two display currencies:
        </p>
        <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4 mb-4">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-neutral-500"><th className="pb-2">Currency</th><th className="pb-2">Symbol</th><th className="pb-2">Use For</th></tr></thead>
            <tbody className="text-neutral-300">
              <tr className="border-t border-neutral-800"><td className="py-2">US Dollar</td><td className="py-2 font-mono">USD ($)</td><td className="py-2">US stocks, international comparison</td></tr>
              <tr className="border-t border-neutral-800"><td className="py-2">Indian Rupee</td><td className="py-2 font-mono">INR (&#8377;)</td><td className="py-2">Indian stocks (NSE/BSE), local portfolio valuation</td></tr>
            </tbody>
          </table>
        </div>

        <h3 className="font-medium text-white mb-2">Exchange Rate</h3>
        <p className="text-neutral-400 mb-3 leading-relaxed">
          The platform fetches a <strong className="text-white">live exchange rate</strong> (USD/INR) from an external API
          and uses it for automatic currency conversion. The current rate is displayed on the settings page.
        </p>
        <ul className="list-disc list-inside text-sm text-neutral-400 space-y-1 mb-4">
          <li>Rate updates automatically when you open the settings page</li>
          <li>Status indicator shows: <span className="text-emerald-400">green</span> (live), <span className="text-amber-400">amber</span> (loading), <span className="text-red-400">red</span> (failed)</li>
          <li>If the rate fetch fails, a fallback rate is used</li>
        </ul>

        <h3 className="font-medium text-white mb-2">How Conversion Works</h3>
        <p className="text-neutral-400 leading-relaxed">
          When your display currency differs from a stock&apos;s native currency, values are automatically converted.
          For example, if you set INR and view a US stock, prices are shown in INR using the live exchange rate.
          Indian stocks (symbols ending in .NS or .BO) are natively in INR and are converted when displaying in USD.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-3">Profile</h2>
        <p className="text-neutral-400 leading-relaxed">
          Your profile information (name, email, organization) is set during registration.
          Your name appears in the app sidebar footer and on the landing page when logged in.
          You can log out from the sidebar footer.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-3">Keyboard Shortcuts</h2>
        <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-neutral-500"><th className="pb-2">Shortcut</th><th className="pb-2">Action</th><th className="pb-2">Where</th></tr></thead>
            <tbody className="text-neutral-300">
              <tr className="border-t border-neutral-800">
                <td className="py-2"><kbd className="px-1.5 py-0.5 text-xs font-mono bg-neutral-800 border border-neutral-700 rounded">/</kbd></td>
                <td className="py-2">Focus the search bar</td>
                <td className="py-2">Any page (when not in an input field)</td>
              </tr>
              <tr className="border-t border-neutral-800">
                <td className="py-2"><kbd className="px-1.5 py-0.5 text-xs font-mono bg-neutral-800 border border-neutral-700 rounded">Esc</kbd></td>
                <td className="py-2">Close search / modal</td>
                <td className="py-2">Search bar, expand modals</td>
              </tr>
              <tr className="border-t border-neutral-800">
                <td className="py-2"><kbd className="px-1.5 py-0.5 text-xs font-mono bg-neutral-800 border border-neutral-700 rounded">Enter</kbd></td>
                <td className="py-2">Select first search result</td>
                <td className="py-2">Search bar with results</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
