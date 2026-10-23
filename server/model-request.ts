import { request } from "undici";

// CPU inference can exceed fetch's default response-header deadline. Apply the
// configured limit to the actual HTTP transport as well as the abort signal.
export async function modelRequest<T>(
  url: string,
  payload: unknown,
  signal: AbortSignal,
  timeout: number,
): Promise<T> {
  const { statusCode, body } = await request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
    headersTimeout: timeout,
    bodyTimeout: timeout,
  });
  if (statusCode < 200 || statusCode >= 300) {
    await body.dump();
    throw new Error(
      `Ollama inference failed (${statusCode}). Check the local model and available memory.`,
    );
  }
  return (await body.json()) as T;
}
