export interface ProblemData {
  title: string;
  description: string;
  platform: string;
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

export async function analyzeProblem(problem: ProblemData): Promise<AnalysisResult> {
  const prompt = `You are an expert CS tutor helping students understand coding problems. Analyze this problem and return ONLY valid JSON, no markdown, no explanation outside the JSON.

Problem Title: ${problem.title}
Platform: ${problem.platform}
Description: ${problem.description}

Return this exact JSON structure:
{
  "simpleExplanation": "2-3 sentences explaining the problem in plain English",
  "pattern": "e.g. Sliding Window / Two Pointers / Dynamic Programming / Graph BFS",
  "approach": "Step-by-step approach in 3-5 concise sentences",
  "timeComplexity": "e.g. O(n log n)",
  "spaceComplexity": "e.g. O(n)",
  "hints": ["hint 1", "hint 2", "hint 3"],
  "optimalSolution": "complete working Python solution with comments"
}`;

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
      temperature: 0.3,
      max_tokens: 1500,
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

  // Strip markdown code fences if model wraps JSON in ```
  const cleaned = content
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  return JSON.parse(cleaned) as AnalysisResult;
}