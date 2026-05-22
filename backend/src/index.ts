import "dotenv/config";
import express from "express";
import cors from "cors";
import analyzeRouter from "./routes/analyze.js";

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: "*" }));
app.use(express.json());
app.use("/analyze", analyzeRouter);

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`AlgoLens backend running on http://localhost:${PORT}`);
});