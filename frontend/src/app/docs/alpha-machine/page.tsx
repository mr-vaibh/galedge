import Link from "next/link";

export default function AlphaMachineDocsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Alpha Machine</h1>
      <p className="text-neutral-400 mb-10">
        The Alpha Machine is a quantitative research environment for building, testing,
        and deploying custom trading models and factors.
      </p>

      {/* Code Editor */}
      <section id="code-editor" className="mb-12">
        <h2 className="text-xl font-semibold mb-3">Code Editor</h2>
        <p className="text-neutral-400 mb-3 leading-relaxed">
          A full <strong className="text-white">VS Code IDE</strong> running in your browser, powered by code-server.
          Write Python scripts, access market data, build and backtest trading strategies — all within
          an isolated sandbox.
        </p>

        <h3 className="font-medium text-white mb-2">How It Works</h3>
        <ol className="list-decimal list-inside text-sm text-neutral-400 space-y-2 mb-4">
          <li>Navigate to <strong className="text-white">Alpha Machine &rarr; Code Editor</strong></li>
          <li>Your workspace is automatically provisioned on first visit</li>
          <li>The VS Code editor loads in an embedded iframe</li>
          <li>Write Python code, run it in the integrated terminal</li>
          <li>Results appear directly in the terminal or as output files</li>
        </ol>

        <h3 className="font-medium text-white mb-2">Available Libraries</h3>
        <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4 mb-4">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <div className="text-neutral-300"><code className="text-emerald-400 text-xs">pandas</code> — data analysis</div>
            <div className="text-neutral-300"><code className="text-emerald-400 text-xs">numpy</code> — numerical computing</div>
            <div className="text-neutral-300"><code className="text-emerald-400 text-xs">scipy</code> — scientific computing</div>
            <div className="text-neutral-300"><code className="text-emerald-400 text-xs">matplotlib</code> — plotting</div>
            <div className="text-neutral-300"><code className="text-emerald-400 text-xs">scikit-learn</code> — machine learning</div>
            <div className="text-neutral-300"><code className="text-emerald-400 text-xs">statsmodels</code> — statistics</div>
            <div className="text-neutral-300"><code className="text-emerald-400 text-xs">cvxpy</code> — optimization</div>
            <div className="text-neutral-300"><code className="text-emerald-400 text-xs">yfinance</code> — market data</div>
          </div>
        </div>

        <h3 className="font-medium text-white mb-2">Workspace Isolation</h3>
        <p className="text-neutral-400 mb-3 leading-relaxed">
          Each user gets a <strong className="text-white">separate, isolated workspace</strong>:
        </p>
        <ul className="list-disc list-inside text-sm text-neutral-400 space-y-1 mb-4">
          <li>Files are stored in your personal workspace directory</li>
          <li>You cannot access other users&apos; workspaces</li>
          <li>Shared example scripts and data are available via symlinks</li>
          <li>The workspace persists across sessions</li>
        </ul>

        <h3 className="font-medium text-white mb-2">Security Restrictions</h3>
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
          <p className="text-sm text-red-400 mb-2">
            <strong>For security, the following are blocked:</strong>
          </p>
          <ul className="list-disc list-inside text-xs text-red-400/80 space-y-0.5">
            <li><code>os.system()</code>, <code>os.popen()</code>, <code>os.exec*()</code></li>
            <li><code>subprocess.run()</code>, <code>subprocess.Popen()</code></li>
            <li>Network access outside of approved libraries</li>
            <li>File access outside your workspace directory</li>
          </ul>
        </div>
        <p className="text-neutral-500 text-sm">
          You can still import and use all data science libraries normally. Only dangerous system-level
          operations are restricted.
        </p>
      </section>

      {/* Build Model */}
      <section id="build-model" className="mb-12">
        <h2 className="text-xl font-semibold mb-3">Build Alpha Model</h2>
        <p className="text-neutral-400 mb-3 leading-relaxed">
          The Build Model module lets you construct alpha models by combining multiple signals.
          An alpha model produces a score for each stock — higher scores indicate more attractive stocks.
        </p>
        <ul className="list-disc list-inside text-sm text-neutral-400 space-y-1">
          <li>Select factors (momentum, value, quality, etc.) and assign weights</li>
          <li>The combined score ranks stocks from most to least attractive</li>
          <li>Use scores to inform portfolio construction or screening</li>
        </ul>
      </section>

      {/* Build Screen */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-3">Build Screen / Factor</h2>
        <p className="text-neutral-400 mb-3 leading-relaxed">
          Create custom screening factors by combining fundamental and technical indicators.
          Screens filter the stock universe down to stocks meeting your criteria.
        </p>
        <ul className="list-disc list-inside text-sm text-neutral-400 space-y-1">
          <li>Define conditions (e.g., P/E &lt; 20 AND Momentum &gt; 0.5)</li>
          <li>Preview which stocks pass your screen</li>
          <li>Save screens for use in strategy building</li>
        </ul>
      </section>

      {/* Upload Factors */}
      <section id="upload-factors" className="mb-12">
        <h2 className="text-xl font-semibold mb-3">Upload Factors</h2>
        <p className="text-neutral-400 mb-3 leading-relaxed">
          Upload your own custom factor data. This allows you to use proprietary signals
          (e.g., alternative data, sentiment scores) alongside the built-in factors.
        </p>
        <p className="text-neutral-500 text-sm">
          Uploaded factors are available in the factor model, optimizer, and analytics pages.
        </p>
      </section>

      <section className="bg-neutral-900/50 rounded-xl border border-neutral-800 p-6">
        <h3 className="font-semibold mb-3">Related</h3>
        <div className="flex flex-col gap-2">
          <Link href="/docs/risk-model" className="text-sm text-emerald-400 hover:underline">&rarr; Factor model documentation</Link>
          <Link href="/docs/strategy-builder" className="text-sm text-emerald-400 hover:underline">&rarr; Using models in strategies</Link>
          <Link href="/docs/optimizer" className="text-sm text-emerald-400 hover:underline">&rarr; Portfolio optimization</Link>
        </div>
      </section>
    </div>
  );
}
