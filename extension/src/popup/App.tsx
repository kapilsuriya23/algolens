import React, { useState, useEffect, useCallback } from "react";
import type { ProblemData, AnalysisResult } from "../types";

type AppState = "idle" | "no-problem" | "ready" | "loading" | "done" | "error";
type TabType = "explain" | "hints" | "solution";
type LangType = "python" | "java" | "c";

const PLATFORM_META: Record<string, { label: string; color: string; dot: string }> = {
  leetcode:      { label: "LeetCode",      color: "#FFA116", dot: "🟠" },
  geeksforgeeks: { label: "GeeksForGeeks", color: "#2F8D46", dot: "🟢" },
  hackerrank:    { label: "HackerRank",    color: "#00EA64", dot: "🟢" },
  codeforces:    { label: "Codeforces",    color: "#1F8ACB", dot: "🔵" },
};

const LANG_LABELS: Record<LangType, string> = {
  python: "Python",
  java:   "Java",
  c:      "C",
};

/* ── tiny sub-components ─────────────────────────── */

function Skeleton({ h, w = "w-full" }: { h: string; w?: string }) {
  return <div className={`shimmer ${h} ${w}`} />;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="section-label">{children}</p>;
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`card p-3 ${className}`}>{children}</div>;
}

/* ── main App ────────────────────────────────────── */

export default function App() {
  const [state,        setState]        = useState<AppState>("idle");
  const [problem,      setProblem]      = useState<ProblemData | null>(null);
  const [analysis,     setAnalysis]     = useState<AnalysisResult | null>(null);
  const [error,        setError]        = useState("");
  const [showSolution, setShowSolution] = useState(false);
  const [activeTab,    setActiveTab]    = useState<TabType>("explain");
  const [lang,         setLang]         = useState<LangType>("python");
  const [copying,      setCopying]      = useState(false);

  /* detect problem on load */
  useEffect(() => {
    setTimeout(() => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!tab?.id) { setState("no-problem"); return; }
        chrome.tabs.sendMessage(
          tab.id,
          { type: "GET_PROBLEM_DATA" },
          (res: { type: string; payload: ProblemData | null } | undefined) => {
            if (chrome.runtime.lastError || !res) { setState("no-problem"); return; }
            if (res.type === "PROBLEM_DATA" && res.payload) {
              setProblem(res.payload); setState("ready");
            } else { setState("no-problem"); }
          }
        );
      });
    }, 300);
  }, []);

  /* send to backend */
  const analyze = useCallback(() => {
    if (!problem) return;
    setState("loading");
    setShowSolution(false);
    setAnalysis(null);
    setActiveTab("explain");

    chrome.runtime.sendMessage(
      { type: "ANALYZE_PROBLEM", payload: { ...problem, language: lang } },
      (res: { type: "ANALYSIS_RESULT"; payload: AnalysisResult }
          | { type: "ANALYSIS_ERROR";  payload: string }
          | undefined) => {
        if (!res) { setError("No response from background."); setState("error"); return; }
        if (res.type === "ANALYSIS_RESULT") { setAnalysis(res.payload); setState("done"); }
        else { setError(res.payload); setState("error"); }
      }
    );
  }, [problem, lang]);

  const reset = () => { setState("ready"); setAnalysis(null); setShowSolution(false); setActiveTab("explain"); };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopying(true);
    setTimeout(() => setCopying(false), 1500);
  };

  const pm = problem ? (PLATFORM_META[problem.platform] ?? null) : null;

  /* ── render ───────────────────────────────────── */
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", position: "relative", zIndex: 1 }}>

      {/* ── HEADER ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px",
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        position: "relative", zIndex: 2,
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* logo */}
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: "linear-gradient(135deg, var(--accent), #5b4fd4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 14px rgba(124,106,255,0.45)",
            fontSize: 15, flexShrink: 0,
          }}>⬡</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: "-0.3px", lineHeight: 1 }}>
              AlgoLens
            </div>
            <div className="mono" style={{ fontSize: 9, color: "var(--text3)", letterSpacing: "1px" }}>
              AI TUTOR v1.0
            </div>
          </div>
        </div>

        {pm && (
          <span className="platform-badge" style={{
            background: `${pm.color}18`,
            border: `1px solid ${pm.color}40`,
            color: pm.color,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: pm.color, display: "inline-block" }} />
            {pm.label}
          </span>
        )}
      </div>

      {/* ── BODY ── */}
      <div className="popup-body" style={{ flex: 1, overflowY: "auto", maxHeight: 546 }}>

        {/* IDLE */}
        {state === "idle" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 8 }}>
            <Skeleton h="h-16" />
            <Skeleton h="h-10" />
            <Skeleton h="h-10" w="w-3/4" />
          </div>
        )}

        {/* NO PROBLEM */}
        {state === "no-problem" && (
          <div className="fade-up" style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{
              width: 64, height: 64, borderRadius: 20, margin: "0 auto 16px",
              background: "var(--surface2)", border: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28,
            }}>🔍</div>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>No problem detected</div>
            <div style={{ color: "var(--text2)", fontSize: 12, lineHeight: 1.6 }}>
              Navigate to a problem on<br />
              <span style={{ color: "#FFA116" }}>LeetCode</span> · <span style={{ color: "#2F8D46" }}>GeeksForGeeks</span> · <span style={{ color: "#00EA64" }}>HackerRank</span> · <span style={{ color: "#1F8ACB" }}>Codeforces</span>
            </div>
          </div>
        )}

        {/* READY */}
        {state === "ready" && problem && (
          <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* problem card */}
            <div className="card" style={{ padding: "14px 16px" }}>
              <div className="section-label" style={{ marginBottom: 6 }}>Detected Problem</div>
              <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.4, marginBottom: 8 }}>
                {problem.title}
              </div>
              <div style={{
                fontSize: 11.5, color: "var(--text2)", lineHeight: 1.6,
                display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
              }}>
                {problem.description}
              </div>
            </div>

            {/* language selector */}
            <div>
              <div className="section-label">Solution Language</div>
              <div style={{ display: "flex", gap: 6 }}>
                {(["python","java","c"] as LangType[]).map(l => (
                  <button key={l} className={`lang-btn ${lang === l ? "active" : ""}`}
                    onClick={() => setLang(l)}>
                    {LANG_LABELS[l]}
                  </button>
                ))}
              </div>
            </div>

            <button className="btn-primary" style={{ width: "100%", padding: "13px" }} onClick={analyze}>
              Analyze with AI →
            </button>
          </div>
        )}

        {/* LOADING */}
        {state === "loading" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 8 }}>
            <div style={{ textAlign: "center", padding: "24px 0 16px" }}>
              <div className="dot-loader" style={{ marginBottom: 12 }}>
                <span /><span /><span />
              </div>
              <div className="mono" style={{ fontSize: 11, color: "var(--text3)" }}>
                Analyzing problem...
              </div>
            </div>
            <Skeleton h="h-20" />
            <Skeleton h="h-12" />
            <Skeleton h="h-12" w="w-4/5" />
            <Skeleton h="h-12" w="w-3/5" />
          </div>
        )}

        {/* ERROR */}
        {state === "error" && (
          <div className="fade-up card" style={{
            padding: "16px", borderColor: "rgba(255,80,80,0.25)",
            background: "rgba(255,40,40,0.06)",
          }}>
            <div style={{ fontWeight: 600, color: "#ff6b6b", marginBottom: 6, fontSize: 13 }}>
              ⚠ Analysis failed
            </div>
            <div style={{ color: "var(--text2)", fontSize: 12, marginBottom: 12, lineHeight: 1.5 }}>
              {error}
            </div>
            <button className="btn-ghost" style={{ padding: "6px 14px" }} onClick={analyze}>
              Try again
            </button>
          </div>
        )}

        {/* DONE */}
        {state === "done" && analysis && (
          <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {/* title + pattern row */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {problem && (
                <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.4 }}>
                  {problem.title}
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span className="pattern-tag">◈ {analysis.pattern}</span>
                <span style={{ display: "flex", gap: 6 }}>
                  <span className="chip chip-time">⏱ {analysis.timeComplexity}</span>
                  <span className="chip chip-space">◻ {analysis.spaceComplexity}</span>
                </span>
              </div>
            </div>

            {/* Tabs */}
            <div className="tab-pill">
              {(["explain","hints","solution"] as TabType[]).map(t => (
                <button key={t} className={activeTab === t ? "active" : ""} onClick={() => setActiveTab(t)}>
                  {t === "explain" ? "📖 Explain" : t === "hints" ? "💡 Hints" : "🔑 Solution"}
                </button>
              ))}
            </div>

            {/* EXPLAIN TAB */}
            {activeTab === "explain" && (
              <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <SectionLabel>Simple Explanation</SectionLabel>
                  <Card>
                    <p style={{ fontSize: 12.5, lineHeight: 1.7, color: "var(--text)" }}>
                      {analysis.simpleExplanation}
                    </p>
                  </Card>
                </div>
                <div>
                  <SectionLabel>Approach</SectionLabel>
                  <Card>
                    <p style={{ fontSize: 12.5, lineHeight: 1.7, color: "var(--text)" }}>
                      {analysis.approach}
                    </p>
                  </Card>
                </div>
                <div>
                  <SectionLabel>Complexity</SectionLabel>
                  <div style={{ display: "flex", gap: 8 }}>
                    <div className="card" style={{
                      flex: 1, padding: "12px 14px",
                      background: "rgba(124,106,255,0.07)",
                      borderColor: "rgba(124,106,255,0.18)",
                    }}>
                      <div className="mono" style={{ fontSize: 9, color: "var(--text3)", letterSpacing: "1px", marginBottom: 5 }}>TIME</div>
                      <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: "var(--accent)" }}>
                        {analysis.timeComplexity}
                      </div>
                    </div>
                    <div className="card" style={{
                      flex: 1, padding: "12px 14px",
                      background: "rgba(0,212,255,0.06)",
                      borderColor: "rgba(0,212,255,0.18)",
                    }}>
                      <div className="mono" style={{ fontSize: 9, color: "var(--text3)", letterSpacing: "1px", marginBottom: 5 }}>SPACE</div>
                      <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: "var(--accent2)" }}>
                        {analysis.spaceComplexity}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* HINTS TAB */}
            {activeTab === "hints" && (
              <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {analysis.hints.map((hint, i) => (
                  <div key={i} className="hint-item"
                    style={{ animationDelay: `${i * 70}ms`, animationFillMode: "both" }}>
                    <span className="hint-num">H{i + 1}</span>
                    <p style={{ fontSize: 12.5, lineHeight: 1.65, color: "var(--text)" }}>{hint}</p>
                  </div>
                ))}
              </div>
            )}

            {/* SOLUTION TAB */}
            {activeTab === "solution" && (
              <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {/* lang switcher inside solution tab */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <SectionLabel>Language</SectionLabel>
                  <div style={{ display: "flex", gap: 5 }}>
                    {(["python","java","c"] as LangType[]).map(l => (
                      <button key={l} className={`lang-btn ${lang === l ? "active" : ""}`}
                        onClick={() => setLang(l)}>
                        {LANG_LABELS[l]}
                      </button>
                    ))}
                  </div>
                </div>

                {!showSolution ? (
                  <div className="lock-screen">
                    <div className="lock-icon">🔒</div>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>
                      Attempt it first!
                    </div>
                    <div style={{ color: "var(--text2)", fontSize: 12, lineHeight: 1.6, marginBottom: 16 }}>
                      Read the hints and try to solve the problem yourself before revealing the solution.
                    </div>
                    <button className="btn-primary" style={{ padding: "10px 20px", fontSize: 12 }}
                      onClick={() => setShowSolution(true)}>
                      Show Solution
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="code-block">
                      <div className="code-header">
                        <div className="code-dots">
                          <span style={{ background: "#ff5f57" }} />
                          <span style={{ background: "#febc2e" }} />
                          <span style={{ background: "#28c840" }} />
                        </div>
                        <span className="mono" style={{ fontSize: 10, color: "var(--text3)" }}>
                          {LANG_LABELS[lang].toLowerCase()} · optimal
                        </span>
                        <button className="btn-ghost" style={{ padding: "3px 10px", fontSize: 10 }}
                          onClick={() => copy(getSolution(analysis, lang))}>
                          {copying ? "✓ copied" : "copy"}
                        </button>
                      </div>
                      <div className="code-body">
                        <pre>{getSolution(analysis, lang)}</pre>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* re-analyze */}
            <button className="btn-ghost" style={{ width: "100%", padding: "9px", fontSize: 12 }}
              onClick={reset}>
              ← Re-analyze
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* pick the right solution field based on lang */
function getSolution(analysis: AnalysisResult, lang: LangType): string {
  switch (lang) {
    case "java":   return (analysis as any).optimalSolutionJava   ?? analysis.optimalSolution;
    case "c":      return (analysis as any).optimalSolutionC      ?? analysis.optimalSolution;
    default:       return analysis.optimalSolution;
  }
}