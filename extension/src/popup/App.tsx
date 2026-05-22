import React, { useState, useEffect, useCallback } from "react";
import type { ProblemData, AnalysisResult } from "../types";

type AppState = "idle" | "no-problem" | "ready" | "loading" | "done" | "error";

const PLATFORM_LABELS: Record<string, string> = {
  leetcode: "LeetCode",
  geeksforgeeks: "GeeksForGeeks",
  hackerrank: "HackerRank",
  codeforces: "Codeforces",
};

const PLATFORM_COLORS: Record<string, string> = {
  leetcode: "#FFA116",
  geeksforgeeks: "#2F8D46",
  hackerrank: "#00EA64",
  codeforces: "#1F8ACB",
};

function SkeletonBlock({ h = "h-4" }: { h?: string }) {
  return <div className={`shimmer rounded ${h} w-full`} />;
}

function Tag({
  children,
  color,
}: {
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <span
      className="mono text-xs px-2 py-0.5 rounded-full border"
      style={{
        color: color ?? "var(--accent)",
        borderColor: color ? `${color}44` : "rgba(0,255,135,0.3)",
        background: color ? `${color}11` : "rgba(0,255,135,0.06)",
      }}
    >
      {children}
    </span>
  );
}

function Section({
  label,
  children,
  delay = 0,
}: {
  label: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <div
      className="fade-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
    >
      <p
        className="mono text-xs mb-1.5 tracking-widest uppercase"
        style={{ color: "var(--muted)" }}
      >
        {label}
      </p>
      <div
        className="rounded-xl p-3 text-sm leading-relaxed"
        style={{
          background: "var(--surface2)",
          border: "1px solid var(--border)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function ComplexityBadge({ time, space }: { time: string; space: string }) {
  return (
    <div
      className="fade-up rounded-xl p-3 flex gap-3"
      style={{
        background: "var(--surface2)",
        border: "1px solid var(--border)",
        animationDelay: "200ms",
        animationFillMode: "both",
      }}
    >
      <div className="flex-1">
        <p className="mono text-xs mb-1" style={{ color: "var(--muted)" }}>
          TIME
        </p>
        <p
          className="mono text-sm font-medium"
          style={{ color: "var(--accent)" }}
        >
          {time}
        </p>
      </div>
      <div
        className="w-px self-stretch"
        style={{ background: "var(--border)" }}
      />
      <div className="flex-1">
        <p className="mono text-xs mb-1" style={{ color: "var(--muted)" }}>
          SPACE
        </p>
        <p
          className="mono text-sm font-medium"
          style={{ color: "var(--accent2)" }}
        >
          {space}
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const [state, setState] = useState<AppState>("idle");
  const [problem, setProblem] = useState<ProblemData | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [showSolution, setShowSolution] = useState(false);
  const [activeTab, setActiveTab] = useState<"explain" | "hints" | "solution">(
    "explain"
  );

  useEffect(() => {
  // Small delay so content script has time to respond
  setTimeout(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab?.id) {
        setState("no-problem");
        return;
      }
      chrome.tabs.sendMessage(
        tab.id,
        { type: "GET_PROBLEM_DATA" },
        (response: { type: string; payload: ProblemData | null } | undefined) => {
          if (chrome.runtime.lastError || !response) {
            setState("no-problem");
            return;
          }
          if (response.type === "PROBLEM_DATA" && response.payload) {
            setProblem(response.payload);
            setState("ready");
          } else {
            setState("no-problem");
          }
        }
      );
    });
  }, 300);
}, []);

  const analyze = useCallback(() => {
    if (!problem) return;
    setState("loading");
    setShowSolution(false);
    setAnalysis(null);

    chrome.runtime.sendMessage(
      { type: "ANALYZE_PROBLEM", payload: problem },
      (
        response:
          | { type: "ANALYSIS_RESULT"; payload: AnalysisResult }
          | { type: "ANALYSIS_ERROR"; payload: string }
          | undefined
      ) => {
        if (!response) {
          setError("No response from background script.");
          setState("error");
          return;
        }
        if (response.type === "ANALYSIS_RESULT") {
          setAnalysis(response.payload);
          setState("done");
        } else {
          setError(response.payload);
          setState("error");
        }
      }
    );
  }, [problem]);

  const resetToReady = () => {
    setState("ready");
    setAnalysis(null);
    setShowSolution(false);
    setActiveTab("explain");
  };

  return (
    <div className="flex flex-col" style={{ minHeight: 560 }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center glow-pulse"
            style={{
              background: "rgba(0,255,135,0.12)",
              border: "1px solid rgba(0,255,135,0.3)",
            }}
          >
            <span style={{ fontSize: 14 }}>⬡</span>
          </div>
          <div>
            <p
              className="text-sm font-bold tracking-tight"
              style={{ color: "var(--text)", lineHeight: 1 }}
            >
              AlgoLens
            </p>
            <p className="mono text-xs" style={{ color: "var(--muted)" }}>
              v1.0
            </p>
          </div>
        </div>

        {problem && (
          <Tag color={PLATFORM_COLORS[problem.platform]}>
            {PLATFORM_LABELS[problem.platform]}
          </Tag>
        )}
      </div>

      {/* Body */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-4"
        style={{ maxHeight: 496 }}
      >
        {/* IDLE */}
        {state === "idle" && (
          <div className="flex items-center justify-center h-48">
            <div className="shimmer rounded-lg w-full h-32" />
          </div>
        )}

        {/* NO PROBLEM */}
        {state === "no-problem" && (
          <div className="fade-up text-center py-12 space-y-3">
            <p style={{ fontSize: 40 }}>🔍</p>
            <p className="font-semibold" style={{ color: "var(--text)" }}>
              No problem detected
            </p>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Open a problem on LeetCode, GeeksForGeeks, HackerRank, or
              Codeforces
            </p>
          </div>
        )}

        {/* READY */}
        {state === "ready" && problem && (
          <div className="space-y-4 fade-up">
            <div
              className="rounded-xl p-4 space-y-2"
              style={{
                background: "var(--surface2)",
                border: "1px solid var(--border)",
              }}
            >
              <p
                className="mono text-xs tracking-widest uppercase"
                style={{ color: "var(--muted)" }}
              >
                Detected
              </p>
              <p
                className="font-bold text-base leading-snug"
                style={{ color: "var(--text)" }}
              >
                {problem.title}
              </p>
              <p
                className="text-xs leading-relaxed line-clamp-3"
                style={{ color: "var(--muted)" }}
              >
                {problem.description}
              </p>
            </div>

            <button
              onClick={analyze}
              className="w-full py-3 rounded-xl font-bold text-sm tracking-wide transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background:
                  "linear-gradient(135deg, var(--accent), var(--accent2))",
                color: "#0a0a0f",
              }}
            >
              Analyze Problem →
            </button>
          </div>
        )}

        {/* LOADING */}
        {state === "loading" && (
          <div className="space-y-3">
            <p
              className="mono text-xs text-center"
              style={{ color: "var(--muted)" }}
            >
              Analyzing with AI...
            </p>
            {[...Array(5)].map((_, i) => (
              <SkeletonBlock key={i} h={i === 0 ? "h-20" : "h-10"} />
            ))}
          </div>
        )}

        {/* ERROR */}
        {state === "error" && (
          <div
            className="fade-up rounded-xl p-4 text-sm space-y-3"
            style={{
              background: "#1a0a0a",
              border: "1px solid rgba(255,80,80,0.3)",
            }}
          >
            <p className="font-semibold" style={{ color: "#ff5050" }}>
              Something went wrong
            </p>
            <p style={{ color: "var(--muted)" }}>{error}</p>
            <button
              onClick={analyze}
              className="mono text-xs px-3 py-1.5 rounded-lg"
              style={{
                background: "rgba(255,80,80,0.1)",
                color: "#ff5050",
                border: "1px solid rgba(255,80,80,0.3)",
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* DONE */}
        {state === "done" && analysis && (
          <div className="space-y-4">
            {/* Problem title */}
            {problem && (
              <div className="fade-up">
                <p
                  className="font-bold text-sm leading-snug"
                  style={{ color: "var(--text)" }}
                >
                  {problem.title}
                </p>
                <p
                  className="mono text-xs mt-0.5"
                  style={{ color: "var(--muted)" }}
                >
                  Pattern:{" "}
                  <span style={{ color: "var(--accent)" }}>
                    {analysis.pattern}
                  </span>
                </p>
              </div>
            )}

            {/* Tabs */}
            <div
              className="flex rounded-xl p-1 gap-1"
              style={{ background: "var(--surface2)" }}
            >
              {(["explain", "hints", "solution"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="flex-1 py-1.5 rounded-lg mono text-xs font-medium transition-all"
                  style={{
                    background:
                      activeTab === tab ? "var(--surface)" : "transparent",
                    color:
                      activeTab === tab ? "var(--text)" : "var(--muted)",
                    border:
                      activeTab === tab
                        ? "1px solid var(--border)"
                        : "1px solid transparent",
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab: explain */}
            {activeTab === "explain" && (
              <div className="space-y-3">
                <Section label="Simple explanation" delay={0}>
                  {analysis.simpleExplanation}
                </Section>
                <Section label="Approach" delay={80}>
                  {analysis.approach}
                </Section>
                <div
                  className="fade-up"
                  style={{
                    animationDelay: "160ms",
                    animationFillMode: "both",
                  }}
                >
                  <p
                    className="mono text-xs mb-1.5 tracking-widest uppercase"
                    style={{ color: "var(--muted)" }}
                  >
                    Complexity
                  </p>
                  <ComplexityBadge
                    time={analysis.timeComplexity}
                    space={analysis.spaceComplexity}
                  />
                </div>
              </div>
            )}

            {/* Tab: hints */}
            {activeTab === "hints" && (
              <div className="space-y-2">
                {analysis.hints.map((hint, i) => (
                  <div
                    key={i}
                    className="fade-up flex gap-3 rounded-xl p-3"
                    style={{
                      background: "var(--surface2)",
                      border: "1px solid var(--border)",
                      animationDelay: `${i * 60}ms`,
                      animationFillMode: "both",
                    }}
                  >
                    <span
                      className="mono text-xs font-medium mt-0.5 shrink-0"
                      style={{ color: "var(--accent)", minWidth: 16 }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: "var(--text)" }}
                    >
                      {hint}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Tab: solution */}
            {activeTab === "solution" && (
              <div className="fade-up space-y-3">
                {!showSolution ? (
                  <div
                    className="rounded-xl p-5 text-center space-y-3"
                    style={{
                      background: "var(--surface2)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <p style={{ fontSize: 32 }}>🔒</p>
                    <p
                      className="font-semibold text-sm"
                      style={{ color: "var(--text)" }}
                    >
                      Try it yourself first
                    </p>
                    <p className="text-xs" style={{ color: "var(--muted)" }}>
                      Use the hints tab to attempt the problem before viewing
                      the solution.
                    </p>
                    <button
                      onClick={() => setShowSolution(true)}
                      className="mt-1 px-4 py-2 rounded-lg mono text-xs font-medium transition-all hover:scale-[1.03]"
                      style={{
                        background: "rgba(0,255,135,0.08)",
                        color: "var(--accent)",
                        border: "1px solid rgba(0,255,135,0.25)",
                      }}
                    >
                      I give up, show solution
                    </button>
                  </div>
                ) : (
                  <div
                    className="rounded-xl overflow-hidden"
                    style={{ border: "1px solid var(--border)" }}
                  >
                    <div
                      className="px-3 py-2 flex items-center justify-between"
                      style={{
                        background: "#0d0d16",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      <span
                        className="mono text-xs"
                        style={{ color: "var(--muted)" }}
                      >
                        optimal solution
                      </span>
                      <button
                        onClick={() =>
                          navigator.clipboard.writeText(analysis.optimalSolution)
                        }
                        className="mono text-xs px-2 py-0.5 rounded"
                        style={{
                          color: "var(--accent)",
                          background: "rgba(0,255,135,0.06)",
                        }}
                      >
                        copy
                      </button>
                    </div>
                    <pre
                      className="mono text-xs p-3 overflow-x-auto leading-relaxed"
                      style={{
                        color: "#c9d1d9",
                        background: "#0d0d16",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {analysis.optimalSolution}
                    </pre>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={resetToReady}
              className="w-full py-2 mono text-xs rounded-xl transition-colors"
              style={{ color: "var(--muted)", border: "1px solid var(--border)" }}
            >
              ← Re-analyze
            </button>
          </div>
        )}
      </div>
    </div>
  );
}