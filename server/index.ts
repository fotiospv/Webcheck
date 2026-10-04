import express from "express";
import cors from "cors";
import { chromium } from "playwright";
import type { Page, Response } from "playwright";

const app = express();
app.use(cors());
app.use(express.json({ limit: "50kb" }));

type Status = "PASS" | "FAILED" | "SKIPPED";

type Result = {
  id: string;
  title: string;
  category: string;
  status: Status;
  summary: string;
  details?: string;
};

function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const parsed = new URL(withProtocol);

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only HTTP and HTTPS URLs are supported.");
  }

  return parsed.toString();
}

async function runScan(target: string): Promise<{ results: Result[]; durationMs: number }> {
  const started = Date.now();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const consoleErrors: string[] = [];
  const failedResponses: string[] = [];
  const requests = new Set<string>();

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  page.on("requestfailed", (request) => {
    failedResponses.push(`${request.method()} ${request.url()} — ${request.failure()?.errorText ?? "request failed"}`);
  });

  page.on("request", (request) => requests.add(request.url()));

  let response: Response | null = null;
  let pageError = "";

  try {
    response = await page.goto(target, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForLoadState("load", { timeout: 10000 }).catch(() => {});
  } catch (error) {
    pageError = error instanceof Error ? error.message : "Navigation failed";
  }

  const results: Result[] = [];

  results.push({
    id: "AUTO-001",
    title: "Target page loads",
    category: "Reliability",
    status: response && response.ok() ? "PASS" : "FAILED",
    summary: response
      ? `Initial response returned HTTP ${response.status()}.`
      : "The browser could not load the target page.",
    details: pageError || undefined
  });

  const title = await page.title().catch(() => "");
  results.push({
    id: "AUTO-002",
    title: "Page has a title",
    category: "Basic HTML",
    status: title.trim() ? "PASS" : "FAILED",
    summary: title.trim() ? `Document title: "${title.trim()}".` : "The document does not have a usable title."
  });

  const htmlLang = await page.locator("html").getAttribute("lang").catch(() => null);
  results.push({
    id: "AUTO-003",
    title: "HTML language is declared",
    category: "Accessibility",
    status: htmlLang ? "PASS" : "FAILED",
    summary: htmlLang ? `HTML lang attribute is "${htmlLang}".` : "The <html> element has no lang attribute."
  });

  const brokenImages = await page.locator("img").evaluateAll((images) =>
    images.filter((img) => !(img as HTMLImageElement).complete || (img as HTMLImageElement).naturalWidth === 0)
      .map((img) => (img as HTMLImageElement).src)
      .slice(0, 10)
  ).catch(() => []);

  results.push({
    id: "AUTO-004",
    title: "Images load successfully",
    category: "UI / Reliability",
    status: brokenImages.length === 0 ? "PASS" : "FAILED",
    summary: brokenImages.length === 0
      ? "No broken images were detected on the initial page."
      : `${brokenImages.length} broken image(s) detected.`,
    details: brokenImages.length ? brokenImages.join("\n") : undefined
  });

  const internalLinks = await page.locator("a[href]").evaluateAll((anchors, origin) =>
    anchors.map((a) => (a as HTMLAnchorElement).href)
      .filter((href) => {
        try {
          const url = new URL(href);
          return url.origin === origin && ["http:", "https:"].includes(url.protocol);
        } catch {
          return false;
        }
      })
      .filter((href, index, list) => list.indexOf(href) === index)
      .slice(0, 30),
    new URL(target).origin
  ).catch(() => []);

  const linkFailures: string[] = [];
  for (const link of internalLinks) {
    try {
      const check = await page.request.get(link, { timeout: 8000 });
      if (check.status() >= 400) linkFailures.push(`${check.status()} ${link}`);
    } catch {
      linkFailures.push(`REQUEST_FAILED ${link}`);
    }
  }

  results.push({
    id: "AUTO-005",
    title: "Internal links are reachable",
    category: "Navigation",
    status: linkFailures.length === 0 ? "PASS" : "FAILED",
    summary: internalLinks.length
      ? `${internalLinks.length} unique internal link(s) checked.`
      : "No internal links were found on the initial page.",
    details: linkFailures.length ? linkFailures.slice(0, 10).join("\n") : undefined
  });

  const forms = await page.locator("form").count();
  if (forms === 0) {
    results.push({
      id: "AUTO-006",
      title: "Form controls have labels",
      category: "Accessibility",
      status: "SKIPPED",
      summary: "No forms were detected on the initial page."
    });
  } else {
    const unlabeledControls = await page.locator("input, select, textarea").evaluateAll((controls) =>
      controls.filter((control) => {
        const el = control as HTMLInputElement;
        if (el.type === "hidden") return false;
        if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) return false;
        const id = el.id;
        return !(id && document.querySelector(`label[for="${CSS.escape(id)}"]`));
      }).length
    );
    results.push({
      id: "AUTO-006",
      title: "Form controls have labels",
      category: "Accessibility",
      status: unlabeledControls === 0 ? "PASS" : "FAILED",
      summary: unlabeledControls === 0
        ? "Visible form controls have associated labels or accessible names."
        : `${unlabeledControls} visible form control(s) appear to lack an accessible label.`
    });
  }

  results.push({
    id: "AUTO-007",
    title: "No browser console errors",
    category: "Reliability",
    status: consoleErrors.length === 0 ? "PASS" : "FAILED",
    summary: consoleErrors.length === 0
      ? "No console messages with error severity were captured."
      : `${consoleErrors.length} console error(s) were captured.`,
    details: consoleErrors.slice(0, 10).join("\n")
  });

  results.push({
    id: "AUTO-008",
    title: "No failed network requests",
    category: "Reliability",
    status: failedResponses.length === 0 ? "PASS" : "FAILED",
    summary: failedResponses.length === 0
      ? "No browser request failures were captured."
      : `${failedResponses.length} failed browser request(s) were captured.`,
    details: failedResponses.slice(0, 10).join("\n")
  });

  const viewportIssue = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2).catch(() => false);
  results.push({
    id: "AUTO-009",
    title: "No obvious horizontal overflow",
    category: "Responsive UI",
    status: viewportIssue ? "FAILED" : "PASS",
    summary: viewportIssue
      ? `Document width (${document.documentElement.scrollWidth}px) exceeds viewport width (${window.innerWidth}px).`
      : "No horizontal overflow was detected at the desktop test viewport."
  });

  const headings = await page.locator("h1").count().catch(() => 0);
  results.push({
    id: "AUTO-010",
    title: "Page contains a main heading",
    category: "Accessibility / Structure",
    status: headings > 0 ? "PASS" : "FAILED",
    summary: headings > 0 ? `Found ${headings} H1 element(s).` : "No H1 heading was detected."
  });

  await browser.close();
  return { results, durationMs: Date.now() - started };
}

app.post("/api/scan", async (req, res) => {
  try {
    if (typeof req.body?.url !== "string" || !req.body.url.trim()) {
      return res.status(400).json({ error: "Please provide a website URL." });
    }

    const target = normalizeUrl(req.body.url);
    const { results, durationMs } = await runScan(target);

    const pass = results.filter((r) => r.status === "PASS").length;
    const failed = results.filter((r) => r.status === "FAILED").length;
    const score = Math.round((pass / (results.length - results.filter(r => r.status === "SKIPPED").length)) * 100) || 0;

    return res.json({ target, durationMs, results, score, failed });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to scan target.";
    return res.status(400).json({ error: message });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(3001, () => {
  console.log("WebCheck QA API listening on http://localhost:3001");
});
