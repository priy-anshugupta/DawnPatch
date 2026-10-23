import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { modelRequest } from "../server/model-request.ts";

test("model transport accepts delayed headers and retains structured response", async () => {
  const server = createServer((req, res) => {
    let text = "";
    req.on("data", (chunk) => {
      text += chunk;
    });
    req.on("end", () =>
      setTimeout(() => {
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            message: { content: JSON.parse(text).prompt },
            eval_count: 12,
          }),
        );
      }, 150),
    );
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const port = (server.address() as { port: number }).port;
    const output = await modelRequest<{
      message: { content: string };
      eval_count: number;
    }>(
      `http://127.0.0.1:${port}/api/chat`,
      { prompt: "exact source" },
      AbortSignal.timeout(2000),
      2000,
    );
    assert.equal(output.message.content, "exact source");
    assert.equal(output.eval_count, 12);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test("model transport cancels a request while waiting for model output", async () => {
  const server = createServer(() => {});
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const port = (server.address() as { port: number }).port;
    await assert.rejects(
      modelRequest(
        `http://127.0.0.1:${port}/api/chat`,
        {},
        AbortSignal.timeout(50),
        2000,
      ),
    );
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
