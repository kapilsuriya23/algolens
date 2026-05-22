import type { MessageType, AnalysisResult } from "../types";

const BACKEND_URL = "http://localhost:3001";

chrome.runtime.onMessage.addListener(
  (message: MessageType, _sender, sendResponse) => {
    if (message.type === "ANALYZE_PROBLEM") {
      const payload = message.payload;

      fetch(`${BACKEND_URL}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then((res) => {
          if (!res.ok) throw new Error(`Server error: ${res.status}`);
          return res.json() as Promise<AnalysisResult>;
        })
        .then((data) => {
          sendResponse({ type: "ANALYSIS_RESULT", payload: data });
        })
        .catch((err: Error) => {
          sendResponse({ type: "ANALYSIS_ERROR", payload: err.message });
        });

      return true;
    }
  }
);