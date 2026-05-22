import { Router } from "express";
import type { Request, Response } from "express";
import { analyzeProblem } from "../services/ai.js";
import type { ProblemData } from "../services/ai.js";

const router = Router();

router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const problem = req.body as ProblemData;

    if (!problem?.title || !problem?.description) {
      res.status(400).json({ error: "Missing title or description" });
      return;
    }

    const result = await analyzeProblem(problem);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

export default router;