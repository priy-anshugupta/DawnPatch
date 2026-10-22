import "dotenv/config";
import path from "node:path";
import fs from "node:fs";
export const root = process.cwd();
export const dataDir =
  process.env.DAWNPATCH_DATA_DIR || path.join(root, ".dawnpatch");
fs.mkdirSync(dataDir, { recursive: true });
export const config = {
  port: Number(process.env.PORT || 4310),
  ollama: (process.env.OLLAMA_URL || "http://127.0.0.1:11434").replace(
    /\/$/,
    "",
  ),
  model: process.env.GEMMA_MODEL || "gemma3:1b",
  engine: process.env.WORKFLOW_ENGINE || "local",
  temporal: process.env.TEMPORAL_ADDRESS || "127.0.0.1:7233",
  namespace: process.env.TEMPORAL_NAMESPACE || "default",
  queue: process.env.TEMPORAL_TASK_QUEUE || "dawnpatch",
  roots: (process.env.SOURCE_ROOTS || "").split(path.delimiter).filter(Boolean),
  image: process.env.RUNNER_IMAGE || "node:22-bookworm",
};
