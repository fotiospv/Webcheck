import { FormEvent, useState } from "react";

type Status = "PASS" | "FAILED" | "SKIPPED";
type Stage = "setup" | "manual" | "final";

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

type ManualResult = {
  id: string;
  title: string;
  category: string;
  guidance: string;
  status: Status | null;
  comment: string;
};

const examples = [
  "https://example.com",
  "https://www.wikipedia.org",
  "https://github.com"
];

const initialManualTests: ManualResult[] = [
  {
    id: "MAN-001",
    title: "Visual clarity & consistency",
    category: "UI / Visual",
    guidance:
      "Look for overlapping elements, inconsistent spacing or alignment, hard-to-read text, poor contrast, or anything that looks visually broken.",
    status: null,
    comment: ""
  },
  {
    id: "MAN-002",
    title: "Interaction & feedback",
    category: "Usability",
    guidance:
      "Try the main buttons, menus and interactive elements. Check that their behavior is clear and that the page gives appropriate feedback after an action.",
    status: null,
    comment: ""
  },
  {
    id: "MAN-003",
    title: "Content & usability",
    category: "Usability",
    guidance:
      "Browse the page as a normal user. Look for confusing labels, unclear instructions, awkward navigation, misleading content, or anything unnecessarily difficult to use.",
    status: null,
    comment: ""
  }
];

function App() {
  const [url, setUrl] = useState("");
  const [includeManual, setIncludeManual] = useState<boolean | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [manualResults, setManualResults] =
    useState<ManualResult[]>(initialManualTests);
  const [stage, setStage] = useState<Stage>("setup");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function runScan(event: FormEvent) {
    event.preventDefault();

    if (includeManual === null) {
      setError("Choose whether you want to include manual tests.");
      return;
    }

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

      if (includeManual) {
        setStage("manual");
      } else {
        setStage("final");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function updateManualStatus(id: string, status: Status) {
    setManualResults((current) =>
      current.map((test) =>
        test.id === id ? { ...test, status } : test
      )
    );
  }

  function updateManualComment(id: string, comment: string) {
    setManualResults((current) =>
      current.map((test) =>
        test.id === id ? { ...test, comment } : test
      )
    );
  }

  function submitManualResults() {
    const incomplete = manualResults.some((test) => test.status === null);

    if (incomplete) {
      setError("Complete or skip every manual test before submitting.");
      return;
    }

    setError("");
    setStage("final");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startNewScan() {
    setUrl("");
    setIncludeManual(null);
    setReport(null);
    setManualResults(initialManualTests);
    setStage("setup");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const automatedCounts = report?.results.reduce(
    (acc, result) => {
      acc[result.status]++;
      return acc;
    },
    { PASS: 0, FAILED: 0, SKIPPED: 0 } as Record<Status, number>
  );

  const manualCounts = manualResults.reduce(
    (acc, result) => {
      if (result.status) {
        acc[result.status]++;
      }
      return acc;
    },
    { PASS: 0, FAILED: 0, SKIPPED: 0 } as Record<Status, number>
  );

  const finalCounts =
    report && automatedCounts
      ? {
          PASS:
            automatedCounts.PASS +
            (includeManual ? manualCounts.PASS : 0),
          FAILED:
            automatedCounts.FAILED +
            (includeManual ? manualCounts.FAILED : 0),
          SKIPPED:
            automatedCounts.SKIPPED +
            (includeManual ? manualCounts.SKIPPED : 0)
        }
      : null;

  return (
    <main className="app-shell">
      <section className="hero">
        <div className="eyebrow">WEBSITE QUALITY CHECKS</div>
        <h1>Webcheck</h1>

        <p className="subtitle">
          Automated and guided manual quality checks for public websites.
        </p>

        {stage === "setup" && (
          <>
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

              <div className="manual-choice">
                <span>Include manual tests?</span>

                <div className="choice-buttons">
                  <button
                    type="button"
                    className={includeManual === true ? "selected" : "secondary"}
                    onClick={() => {
                      setIncludeManual(true);
                      setError("");
                    }}
                  >
                    Yes
                  </button>

                  <button
                    type="button"
                    className={includeManual === false ? "selected" : "secondary"}
                    onClick={() => {
                      setIncludeManual(false);
                      setError("");
                    }}
                  >
                    No
                  </button>
                </div>
              </div>

              <button className="analyze-button" disabled={loading}>
                {loading ? "Scanning…" : "Analyze website"}
              </button>
            </form>

            <div className="scope-note">
              <strong>Scope:</strong> Webcheck targets public,
              browser-accessible websites. CAPTCHA, authentication, bot
              protection and highly restricted applications may limit results.
            </div>
          </>
        )}
      </section>

      {error && <div className="error">{error}</div>}

      {loading && (
        <section className="panel loading-panel">
          <div className="spinner" />

          <div>
            <strong>Running browser checks</strong>
            <p>
              Opening the target in Chromium and collecting automated results.
            </p>
          </div>
        </section>
      )}

      {stage === "manual" && report && automatedCounts && (
        <section className="results">
          <div className="phase-heading">
            <div>
              <div className="eyebrow">AUTOMATED TESTING COMPLETE</div>
              <h2>Manual testing</h2>
              <p>
                Open <strong>{report.target}</strong> and review the areas below.
              </p>
            </div>

            <a
              className="open-site"
              href={report.target}
              target="_blank"
              rel="noreferrer"
            >
              Open website
            </a>
          </div>

          <div className="automated-mini-summary">
            <span>{automatedCounts.PASS} passed</span>
            <span>{automatedCounts.FAILED} failed</span>
            <span>{automatedCounts.SKIPPED} skipped</span>
          </div>

          <div className="manual-list">
            {manualResults.map((test) => (
              <article className="manual-test" key={test.id}>
                <div className="result-title">
                  <span className="test-id">{test.id}</span>
                  <strong>{test.title}</strong>
                </div>

                <span className="category">{test.category}</span>

                <p>{test.guidance}</p>

                <div className="manual-status-buttons">
                  {(["PASS", "FAILED", "SKIPPED"] as Status[]).map(
                    (status) => (
                      <button
                        type="button"
                        key={status}
                        className={
                          test.status === status
                            ? `manual-status active ${status.toLowerCase()}`
                            : "manual-status"
                        }
                        onClick={() =>
                          updateManualStatus(test.id, status)
                        }
                      >
                        {status}
                      </button>
                    )
                  )}
                </div>

                <label className="comment-label">
                  Comment <span>optional</span>
                </label>

                <textarea
                  value={test.comment}
                  onChange={(e) =>
                    updateManualComment(test.id, e.target.value)
                  }
                  placeholder="Add an observation..."
                  rows={3}
                />
              </article>
            ))}
          </div>

          <button
            className="submit-report"
            type="button"
            onClick={submitManualResults}
          >
            Submit report
          </button>
        </section>
      )}

      {stage === "final" &&
        report &&
        automatedCounts &&
        finalCounts && (
          <section className="results final-report">
            <div className="final-actions no-print">
              <button
                className="secondary-action"
                type="button"
                onClick={startNewScan}
              >
                New scan
              </button>

              <button
                type="button"
                onClick={() => window.print()}
              >
                Export PDF
              </button>
            </div>

            <div className="report-header">
              <div>
                <div className="eyebrow">FINAL TEST REPORT</div>
                <h2>{report.target}</h2>
              </div>

              <div className="report-meta">
                <span>Automated scan</span>
                <strong>
                  {(report.durationMs / 1000).toFixed(1)}s
                </strong>
              </div>
            </div>

            <div className="summary-grid">
              <div className="score-card">
                <div className="score">{report.score}</div>

                <div>
                  <strong>Automated score</strong>
                  <span>{new URL(report.target).hostname}</span>
                </div>
              </div>

              <div className="stat pass">
                <strong>{finalCounts.PASS}</strong>
                <span>Passed</span>
              </div>

              <div className="stat fail">
                <strong>{finalCounts.FAILED}</strong>
                <span>Failed</span>
              </div>

              <div className="stat skip">
                <strong>{finalCounts.SKIPPED}</strong>
                <span>Skipped</span>
              </div>
            </div>

            <div className="panel">
              <div className="panel-heading">
                <div>
                  <div className="eyebrow">AUTOMATED TESTS</div>
                  <h2>Automated results</h2>
                </div>
              </div>

              <div className="results-list">
                {report.results.map((result) => (
                  <article
                    className="result-row"
                    key={result.id}
                  >
                    <div
                      className={`status ${result.status.toLowerCase()}`}
                    >
                      {result.status}
                    </div>

                    <div className="result-main">
                      <div className="result-title">
                        <span className="test-id">
                          {result.id}
                        </span>

                        <strong>{result.title}</strong>
                      </div>

                      <span className="category">
                        {result.category}
                      </span>

                      <p>{result.summary}</p>

                      {result.details && (
                        <small>{result.details}</small>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </div>

            {includeManual && (
              <div className="panel">
                <div className="panel-heading">
                  <div>
                    <div className="eyebrow">MANUAL TESTS</div>
                    <h2>Manual results</h2>
                  </div>
                </div>

                <div className="results-list">
                  {manualResults.map((result) => (
                    <article
                      className="result-row"
                      key={result.id}
                    >
                      <div
                        className={`status ${result.status?.toLowerCase()}`}
                      >
                        {result.status}
                      </div>

                      <div className="result-main">
                        <div className="result-title">
                          <span className="test-id">
                            {result.id}
                          </span>

                          <strong>{result.title}</strong>
                        </div>

                        <span className="category">
                          {result.category}
                        </span>

                        <p>{result.guidance}</p>

                        {result.comment && (
                          <div className="manual-comment">
                            <strong>Comment:</strong>{" "}
                            {result.comment}
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
    </main>
  );
}

export default App;