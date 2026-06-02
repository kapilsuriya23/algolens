export interface ProblemData {
  title: string;
  description: string;
  platform: string;
  url: string;
  language?: string;
}

export interface AnalysisResult {
  simpleExplanation: string;
  pattern: string;
  approach: string;
  timeComplexity: string;
  spaceComplexity: string;
  hints: string[];
  optimalSolution: string;
  optimalSolutionJava: string;
  optimalSolutionC: string;
}

export async function analyzeProblem(problem: ProblemData): Promise<AnalysisResult> {
  const prompt = `You are an expert CS tutor. Analyze this coding problem and return ONLY valid JSON — no markdown, no text outside the JSON.

Problem Title: ${problem.title}
Platform: ${problem.platform}
Description: ${problem.description}

Return this EXACT JSON structure with all fields populated:
{
  "simpleExplanation": "2-3 sentences explaining the problem in plain English for a beginner",
  "pattern": "single algorithm pattern e.g. Binary Search / Two Pointers / Dynamic Programming",
  "approach": "step-by-step approach in 4-5 concise sentences",
  "timeComplexity": "e.g. O(n log n)",
  "spaceComplexity": "e.g. O(1)",
  "hints": [
    "first hint — directional nudge without giving away the answer",
    "second hint — more specific guidance",
    "third hint — almost there, very close to solution"
  ],
  "optimalSolution": "complete working Python solution with inline comments explaining each step",
  "optimalSolutionJava": "complete working Java solution with inline comments explaining each step",
  "optimalSolutionC": "complete working C solution with inline comments explaining each step"
}

IMPORTANT: All three solutions must be complete, correct, and compilable. Include all necessary imports/headers.`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:3001",
      "X-Title": "AlgoLens",
    },
    body: JSON.stringify({
      model: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 3000,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter error: ${response.status} — ${err}`);
  }

  const data = await response.json() as {
    choices: { message: { content: string } }[];
  };

  const content = data.choices[0]?.message?.content;
  if (!content) throw new Error("No response from OpenRouter");

  // Strip markdown fences if present
  const cleaned = content
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  return JSON.parse(cleaned) as AnalysisResult;
}