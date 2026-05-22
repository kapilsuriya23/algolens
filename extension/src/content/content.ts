import type { Platform, ProblemData } from "../types";

function detectPlatform(url: string): Platform {
  if (url.includes("leetcode.com")) return "leetcode";
  if (url.includes("geeksforgeeks.org")) return "geeksforgeeks";
  if (url.includes("hackerrank.com")) return "hackerrank";
  if (url.includes("codeforces.com")) return "codeforces";
  return "unknown";
}

// LeetCode has a React SPA — DOM loads late, so we try multiple selectors
function extractLeetCode(): { title: string; description: string } | null {
  const titleSelectors = [
    '[data-cy="question-title"]',
    ".text-title-large",
    ".text-title-large a",
    'a[href*="/problems/"]',
    ".mr-2.text-label-1",
    "h1",
  ];

  const descSelectors = [
    '[data-cy="question-content"]',
    ".elfjS",
    ".question-content__JfgR",
    '[class*="question-content"]',
    '[class*="content__"]',
    ".xFUwe",
  ];

  let title = "";
  let description = "";

  for (const sel of titleSelectors) {
    const el = document.querySelector(sel);
    const text = el?.textContent?.trim();
    if (text && text.length > 2) {
      title = text;
      break;
    }
  }

  for (const sel of descSelectors) {
    const el = document.querySelector(sel);
    const text = el?.textContent?.trim();
    if (text && text.length > 20) {
      description = text.slice(0, 2000);
      break;
    }
  }

  // Fallback: grab title from <title> tag e.g. "33. Search in Rotated... - LeetCode"
  if (!title) {
    const pageTitle = document.title;
    if (pageTitle && pageTitle.includes("-")) {
      title = pageTitle.split("-")[0].trim();
    }
  }

  // Fallback: grab description from any large text block
  if (!description) {
    const candidates = document.querySelectorAll("p, div");
    for (const el of candidates) {
      const text = el.textContent?.trim() ?? "";
      if (text.length > 100 && text.length < 3000) {
        description = text.slice(0, 2000);
        break;
      }
    }
  }

  if (!title || !description) return null;
  return { title, description };
}

function extractGeeksForGeeks(): { title: string; description: string } | null {
  const titleEl =
    document.querySelector(".problem-tab--title") ||
    document.querySelector("h1.ui.header") ||
    document.querySelector("h1");
  const descEl =
    document.querySelector(".problem-statement") ||
    document.querySelector(".problems_problem_content__Xm_eO") ||
    document.querySelector('[class*="problem_content"]');

  if (!titleEl) return null;
  const title = titleEl.textContent?.trim() ?? "";
  const description = descEl?.textContent?.trim().slice(0, 2000) ?? "";
  if (!title) return null;
  return { title, description };
}

function extractHackerRank(): { title: string; description: string } | null {
  const titleEl =
    document.querySelector(".hr_tour-challenge-name") ||
    document.querySelector("h1.ui-icon-label") ||
    document.querySelector("h1");
  const descEl =
    document.querySelector(".challenge-body-html") ||
    document.querySelector(".problem-statement");

  if (!titleEl) return null;
  return {
    title: titleEl.textContent?.trim() ?? "",
    description: descEl?.textContent?.trim().slice(0, 2000) ?? "",
  };
}

function extractCodeforces(): { title: string; description: string } | null {
  const titleEl = document.querySelector(".title");
  const descEl = document.querySelector(".problem-statement");
  if (!titleEl) return null;
  return {
    title: titleEl.textContent?.trim() ?? "",
    description: descEl?.textContent?.trim().slice(0, 2000) ?? "",
  };
}

function extractProblem(): ProblemData | null {
  const url = window.location.href;
  const platform = detectPlatform(url);
  let extracted: { title: string; description: string } | null = null;

  switch (platform) {
    case "leetcode":
      extracted = extractLeetCode();
      break;
    case "geeksforgeeks":
      extracted = extractGeeksForGeeks();
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

  if (!extracted) return null;
  return { ...extracted, platform, url };
}

// Wait for DOM to be ready with retries (LeetCode SPA loads content late)
function extractWithRetry(
  retries: number,
  delay: number,
  callback: (data: ProblemData | null) => void
): void {
  const data = extractProblem();
  if (data || retries <= 0) {
    callback(data);
    return;
  }
  setTimeout(() => extractWithRetry(retries - 1, delay, callback), delay);
}

// Cache the result so popup doesn't have to wait
let cachedProblem: ProblemData | null = null;

// Auto-extract when content script loads
extractWithRetry(10, 800, (data) => {
  cachedProblem = data;
});

// Also re-extract on URL change (LeetCode SPA navigation)
let lastUrl = window.location.href;
const observer = new MutationObserver(() => {
  const currentUrl = window.location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    cachedProblem = null;
    extractWithRetry(10, 800, (data) => {
      cachedProblem = data;
    });
  }
});
observer.observe(document.body, { childList: true, subtree: true });

// Listen for popup requesting problem data
chrome.runtime.onMessage.addListener(
  (message: { type: string }, _sender, sendResponse) => {
    if (message.type === "GET_PROBLEM_DATA") {
      if (cachedProblem) {
        sendResponse({ type: "PROBLEM_DATA", payload: cachedProblem });
      } else {
        // Try one more time fresh
        extractWithRetry(5, 600, (data) => {
          cachedProblem = data;
          sendResponse({ type: "PROBLEM_DATA", payload: data });
        });
      }
      return true; // keep channel open for async
    }
  }
);