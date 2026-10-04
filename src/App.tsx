import { FormEvent, useState } from "react";

type Status = "PASS" | "FAILED" | "SKIPPED";

type Result = {
  id: string;
  title: string;
  category: string;
  status: Status;
  summary: string;
  details?: string;
};

type Report = {
  target: string;
  durationMs: number;
  results: Result[];
  score: number;
};

const examples = [
  "https://example.com",
  "https://www.wikipedia.org",
  "https://github.com"
];

function App() {
  const [url, setUrl] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function runScan(event: FormEvent) {
    event.preventDefault();
    setError("");
    setReport(null);
    setLoading(true);

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Scan failed.");
      }

      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const counts = report?.results.reduce(
    (acc, result) => {
      acc[result.status]++;
      return acc;
    },
    { PASS: 0, FAILED: 0, SKIPPED: 0 } as Record<Status, number>
  );

  return (
    <main className="app-shell">
      <section className="hero">
        <div className="eyebrow">QA PORTFOLIO PROJECT · V0.1</div>
        <h1>WebCheck <span>QA</span></h1>
        <p className="subtitle">
          A small browser-based quality inspection tool for public websites.
          Run repeatable checks and turn findings into actionable QA results.
        </p>

        <form className="scan-form" onSubmit={runScan}>
          <label htmlFor="url">Website URL</label>
          <div className="url-row">
            <input
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              type="url"
              required
            />
            <button disabled={loading}>
              {loading ? "Scanning…" : "Analyze website"}
            </button>
          </div>
          <div className="examples">
            Try:
            {examples.map((example) => (
              <button
                type="button"
                key={example}
                onClick={() => setUrl(example)}
              >
                {example.replace("https://", "")}
              </button>
            ))}
          </div>
        </form>

        <div className="scope-note">
          <strong>Scope:</strong> WebCheck QA currently targets public,
          browser-accessible websites. CAPTCHA, authentication, bot protection
          and highly restricted applications may limit results.
        </div>
      </section>

      {error && <div className="error">{error}</div>}

      {loading && (
        <section className="panel loading-panel">
          <div className="spinner" />
          <div>
            <strong>Running browser checks</strong>
            <p>Opening the target in a real Chromium browser and collecting QA results.</p>
          </div>
        </section>
      )}

      {report && counts && (
        <section className="results">
          <div className="summary-grid">
            <div className="score-card">
              <div className="score">{report.score}</div>
              <div>
                <strong>QA score</strong>
                <span>{new URL(report.target).hostname}</span>
              </div>
            </div>
            <div className="stat pass"><strong>{counts.PASS}</strong><span>Passed</span></div>
            <div className="stat fail"><strong>{counts.FAILED}</strong><span>Failed</span></div>
            <div className="stat skip"><strong>{counts.SKIPPED}</strong><span>Skipped</span></div>
          </div>

          <div className="panel">
            <div className="panel-heading">
              <div>
                <div className="eyebrow">TEST REPORT</div>
                <h2>{report.target}</h2>
              </div>
              <span>{(report.durationMs / 1000).toFixed(1)}s</span>
            </div>

            <div className="results-list">
              {report.results.map((result) => (
                <article className="result-row" key={result.id}>
                  <div className={`status ${result.status.toLowerCase()}`}>
                    {result.status}
                  </div>
                  <div className="result-main">
                    <div className="result-title">
                      <span className="test-id">{result.id}</span>
                      <strong>{result.title}</strong>
                    </div>
                    <span className="category">{result.category}</span>
                    <p>{result.summary}</p>
                    {result.details && <small>{result.details}</small>}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

export default App;
