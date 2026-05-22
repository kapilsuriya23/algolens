export type Platform = "leetcode" | "geeksforgeeks" | "hackerrank" | "codeforces" | "unknown";

export interface ProblemData {
  title: string;
  description: string;
  platform: Platform;
  url: string;
}

export interface AnalysisResult {
  simpleExplanation: string;
  pattern: string;
  approach: string;
  timeComplexity: string;
  spaceComplexity: string;
  hints: string[];
  optimalSolution: string;
}

export type MessageType =
  | { type: "GET_PROBLEM_DATA" }
  | { type: "PROBLEM_DATA"; payload: ProblemData | null }
  | { type: "ANALYZE_PROBLEM"; payload: ProblemData }
  | { type: "ANALYSIS_RESULT"; payload: AnalysisResult }
  | { type: "ANALYSIS_ERROR"; payload: string };