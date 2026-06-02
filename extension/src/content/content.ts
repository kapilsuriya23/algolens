import type { Platform, ProblemData } from "../types";

function detectPlatform(url: string): Platform {
  if (url.includes("leetcode.com")) return "leetcode";
  if (url.includes("geeksforgeeks.org")) return "geeksforgeeks";
  if (url.includes("hackerrank.com")) return "hackerrank";
  if (url.includes("codeforces.com")) return "codeforces";
  return "unknown";
}

function cleanText(raw: string): string {
  return raw
    .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── LEETCODE ────────────────────────────────────────────────────────────────
// Uses GraphQL API — 100% reliable, immune to DOM changes
async function extractLeetCodeAPI(): Promise<{ title: string; description: string } | null> {
  try {
    const slug = window.location.pathname.match(/\/problems\/([\w-]+)/)?.[1];
    if (!slug) return null;

    const res = await fetch("https://leetcode.com/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `query getProblem($titleSlug: String!) {
          question(titleSlug: $titleSlug) {
            title
            content
          }
        }`,
        variables: { titleSlug: slug },
      }),
    });

    const json = await res.json();
    const q = json?.data?.question;
    if (!q?.title) return null;

    // Strip HTML tags from content
    const tmp = document.createElement("div");
    tmp.innerHTML = q.content ?? "";
    const description = cleanText(tmp.textContent ?? "").slice(0, 2500);

    return { title: q.title, description };
  } catch {
    return null;
  }
}

// DOM fallback for LeetCode
function extractLeetCodeDOM(): { title: string; description: string } | null {
  const titleSelectors = [
    '[data-cy="question-title"]',
    ".text-title-large a",
    ".text-title-large",
    '[class*="questionTitle"]',
    "h1",
  ];
  const descSelectors = [
    '[data-cy="question-content"]',
    ".elfjS",
    '[class*="question-content"]',
    '[class*="description__"]',
  ];

  let title = "";
  for (const s of titleSelectors) {
    const t = document.querySelector(s)?.textContent?.trim();
    if (t && t.length > 1 && t.length < 120) { title = t; break; }
  }
  if (!title && document.title.includes("- LeetCode")) {
    title = document.title.replace(/\s*-\s*LeetCode.*/, "").trim();
  }

  let description = "";
  for (const s of descSelectors) {
    const el = document.querySelector(s);
    if (!el) continue;
    const clone = el.cloneNode(true) as HTMLElement;
    clone.querySelectorAll("style,script").forEach(n => n.remove());
    const t = cleanText(clone.textContent ?? "");
    const isGarbage = /submit|streak|premium|notebook|sign in/i.test(t.slice(0, 80));
    if (t.length > 60 && !isGarbage) { description = t.slice(0, 2500); break; }
  }

  if (!title) return null;
  return { title, description };
}

// ─── GEEKSFORGEEKS ───────────────────────────────────────────────────────────
// GFG has two layouts: /problems/ (new) and /articles/ (old)
function extractGFG(): { title: string; description: string } | null {
  // ── Title ──
  // New layout: <title>Two Sum - GeeksforGeeks</title>  OR  h3.problems_header_description__...
  const titleSelectors = [
    // new problems layout
    "h3[class*='problems_header_description']",
    ".problems_header_content__title",
    "[class*='problems_header_content'] h3",
    "[class*='problem_title']",
    "[class*='problemTitle']",
    // old layout
    ".problem-tab--title",
    "h1.ui.header",
    ".problems-title",
    '[id="problem-title"]',
    // generic heading that contains problem number pattern like "1. Two Sum"
    "h1",
    "h2",
  ];

  let title = "";
  for (const s of titleSelectors) {
    const el = document.querySelector(s);
    const t = el?.textContent?.trim();
    if (t && t.length > 1 && t.length < 150 && !/geeksforgeeks|practice|courses|jobs/i.test(t)) {
      title = t;
      break;
    }
  }

  // Fallback: extract from <title> tag "Two Sum | Practice | GeeksforGeeks"
  if (!title && document.title) {
    title = document.title.split("|")[0].split("-")[0].trim();
  }

  // ── Description ──
  const descSelectors = [
    // new layout
    "[class*='problems_problem_content']",
    "[class*='problem_content']",
    "[class*='problemContent']",
    "[class*='problem-statement']",
    "[class*='question-statement']",
    // old layout
    ".problem-statement",
    ".problems_problem_content__Xm_eO",
    '[id="problem-statement"]',
    // generic: a div that contains the problem text
    ".content",
  ];

  let description = "";
  for (const s of descSelectors) {
    const el = document.querySelector(s);
    if (!el) continue;
    const clone = el.cloneNode(true) as HTMLElement;
    // Remove code editors, nav, ads, buttons
    clone.querySelectorAll(
      "script,style,button,nav,header,footer,[class*='editor'],[class*='Editor']," +
      "[class*='navbar'],[class*='Navbar'],[class*='sidebar'],[class*='ads']"
    ).forEach(n => n.remove());
    const t = cleanText(clone.textContent ?? "");
    if (t.length > 80) { description = t.slice(0, 2500); break; }
  }

  // Fallback: grab largest text block on page that looks like a problem statement
  if (!description) {
    const allDivs = Array.from(document.querySelectorAll("div, section, article"));
    let best = "";
    for (const el of allDivs) {
      // Skip elements that are clearly nav/header/footer
      const role = el.getAttribute("role") ?? "";
      const cls  = el.className ?? "";
      if (/nav|header|footer|menu|sidebar|banner|advertisement/i.test(cls + role)) continue;
      // Only look at direct text (not deeply nested to avoid the whole page)
      const directText = cleanText(el.textContent ?? "");
      if (
        directText.length > best.length &&
        directText.length < 5000 &&
        directText.length > 100 &&
        !/sign in|log in|register|premium|advertisement/i.test(directText.slice(0, 80))
      ) {
        best = directText;
      }
    }
    description = best.slice(0, 2500);
  }

  if (!title) return null;
  return { title, description };
}

// ─── HACKERRANK ──────────────────────────────────────────────────────────────
function extractHackerRank(): { title: string; description: string } | null {
  // HackerRank loads content inside an iframe sometimes — try both contexts
  const titleSelectors = [
    ".hr_tour-challenge-name",
    ".challenge-name",
    "h1.ui-icon-label",
    "[class*='challenge-name']",
    "[class*='challengeName']",
    "h1",
  ];
  const descSelectors = [
    ".challenge-body-html",
    ".challenge-problem-statement",
    "[class*='challenge-body']",
    "[class*='problem-statement']",
    ".msB8e",   // known 2024 class
  ];

  let title = "";
  for (const s of titleSelectors) {
    const t = document.querySelector(s)?.textContent?.trim();
    if (t && t.length > 1 && t.length < 150) { title = t; break; }
  }
  if (!title && document.title.includes("|")) {
    title = document.title.split("|")[0].trim();
  }

  let description = "";
  for (const s of descSelectors) {
    const el = document.querySelector(s);
    if (!el) continue;
    const clone = el.cloneNode(true) as HTMLElement;
    clone.querySelectorAll("script,style").forEach(n => n.remove());
    const t = cleanText(clone.textContent ?? "");
    if (t.length > 60) { description = t.slice(0, 2500); break; }
  }

  if (!title) return null;
  return { title, description };
}

// ─── CODEFORCES ──────────────────────────────────────────────────────────────
function extractCodeforces(): { title: string; description: string } | null {
  const titleEl =
    document.querySelector(".problem-statement .header .title") ||
    document.querySelector(".title");

  const stmtEl = document.querySelector(".problem-statement");

  if (!titleEl) return null;

  let description = "";
  if (stmtEl) {
    const clone = stmtEl.cloneNode(true) as HTMLElement;
    // Remove the header section (title, time, memory limits) from description
    clone.querySelector(".header")?.remove();
    clone.querySelectorAll("script,style,.section-title").forEach(n => n.remove());
    description = cleanText(clone.textContent ?? "").slice(0, 2500);
  }

  return {
    title: cleanText(titleEl.textContent ?? ""),
    description,
  };
}

// ─── MAIN EXTRACTOR ──────────────────────────────────────────────────────────
async function extractProblem(): Promise<ProblemData | null> {
  const url      = window.location.href;
  const platform = detectPlatform(url);

  let extracted: { title: string; description: string } | null = null;

  switch (platform) {
    case "leetcode":
      // Try API first (most reliable), fall back to DOM
      extracted = await extractLeetCodeAPI();
      if (!extracted || extracted.description.length < 30) {
        extracted = extractLeetCodeDOM();
      }
      break;
    case "geeksforgeeks":
      extracted = extractGFG();
      break;
    case "hackerrank":
      extracted = extractHackerRank();
      break;
    case "codeforces":
      extracted = extractCodeforces();
      break;
    default:
      return null;
  }

  if (!extracted || !extracted.title) return null;
  return { ...extracted, platform, url };
}

// ─── VALIDITY CHECK ──────────────────────────────────────────────────────────
function isValid(data: ProblemData | null): boolean {
  if (!data) return false;
  if (data.title.length < 2) return false;
  if (data.description.length < 30) return false;
  // Garbage check: description shouldn't start with nav text
  if (/^(submit|debug|streak|premium|sign in|log in|courses)/i.test(data.description)) return false;
  return true;
}

// ─── RETRY WITH ASYNC SUPPORT ────────────────────────────────────────────────
async function extractWithRetry(
  retries: number,
  delay: number
): Promise<ProblemData | null> {
  const data = await extractProblem();
  if (isValid(data)) return data;
  if (retries <= 0) return data; // return whatever we have
  await new Promise(r => setTimeout(r, delay));
  return extractWithRetry(retries - 1, delay);
}

// ─── CACHE ───────────────────────────────────────────────────────────────────
let cachedProblem: ProblemData | null = null;
let cacheReady = false;

(async () => {
  cachedProblem = await extractWithRetry(12, 700);
  cacheReady = true;
})();

// Re-extract on SPA URL change (LeetCode, GFG)
let lastUrl = window.location.href;
new MutationObserver(async () => {
  const cur = window.location.href;
  if (cur !== lastUrl) {
    lastUrl = cur;
    cachedProblem = null;
    cacheReady = false;
    cachedProblem = await extractWithRetry(12, 700);
    cacheReady = true;
  }
}).observe(document.body, { childList: true, subtree: true });

// ─── MESSAGE LISTENER ────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener(
  (message: { type: string }, _sender, sendResponse) => {
    if (message.type === "GET_PROBLEM_DATA") {
      if (cacheReady) {
        sendResponse({ type: "PROBLEM_DATA", payload: cachedProblem });
      } else {
        // Wait up to 8s for cache to be ready
        const start = Date.now();
        const poll = setInterval(() => {
          if (cacheReady || Date.now() - start > 8000) {
            clearInterval(poll);
            sendResponse({ type: "PROBLEM_DATA", payload: cachedProblem });
          }
        }, 200);
      }
      return true; // keep message channel open for async
    }
  }
);