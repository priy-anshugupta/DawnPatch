export async function api<T = any>(
  url: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const r = await fetch("/api" + url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-DawnPatch": "local-workbench",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!r.ok) {
    const data = await r.json().catch(() => ({ error: r.statusText }));
    throw new Error(data.error || "Request failed");
  }
  return (r.status === 204 ? undefined : await r.json()) as T;
}
export function download(text: string, name: string, type = "text/markdown") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const outcomeLabel = (value: string) =>
  ({
    pending: "In progress",
    patch_verified: "Patch verified",
    patch_failed: "Patch needs work",
    not_reproduced: "Not reproduced",
    needs_information: "Needs information",
  })[value] || value.replaceAll("_", " ");
export function relative(value: string) {
  const minutes = Math.floor((Date.now() - Date.parse(value)) / 60000);
  return minutes < 1
    ? "Just now"
    : minutes < 60
      ? `${minutes}m ago`
      : minutes < 1440
        ? `${Math.floor(minutes / 60)}h ago`
        : new Date(value).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
          });
}
