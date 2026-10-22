import fs from "node:fs/promises";
import path from "node:path";
import { getRun, patchRun, event, getKV, setKV } from "./db.ts";
import {
  authorizedRepo,
  exec,
  hashCandidate,
  workspace,
} from "./workspaces.ts";
async function api(url: string, method = "GET", body?: unknown) {
  const r = await fetch(`https://api.github.com${url}`, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(process.env.GITHUB_TOKEN
        ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
        : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok)
    throw new Error(
      `GitHub ${method} failed (${r.status}). Check repository permissions and token access.`,
    );
  return r.json();
}
export async function importIssue(url: string) {
  const m =
    /^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/issues\/(\d+)\/?$/.exec(url);
  if (!m)
    throw new Error(
      "Use a GitHub issue URL such as https://github.com/owner/repo/issues/123.",
    );
  const data = await api(`/repos/${m[1]}/${m[2]}/issues/${m[3]}`);
  if (data.pull_request)
    throw new Error("This URL is a pull request, not an issue.");
  return {
    title: String(data.title).slice(0, 200),
    description: String(data.body || "").slice(0, 10000),
    issueUrl: url,
  };
}
async function destination(repositoryPath: string) {
  const repo = await authorizedRepo(repositoryPath);
  const { stdout } = await exec("git", [
    "-C",
    repo,
    "remote",
    "get-url",
    "origin",
  ]);
  const match =
    /^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)([\w.-]+)\/([\w.-]+?)(?:\.git)?$/.exec(
      stdout.trim(),
    );
  if (!match) throw new Error("Publication requires a GitHub origin.");
  return `${match[1]}/${match[2]}`;
}
export async function approve(id: string, hash: string) {
  const run = getRun(id);
  if (run.outcome !== "patch_verified" || run.status !== "awaiting_review")
    throw new Error(
      "Only a passing candidate awaiting review can be approved.",
    );
  const actual = await hashCandidate(id, run.changes);
  if (hash !== actual || hash !== run.candidateHash)
    throw new Error("Candidate changed. Reverification is required.");
  const target =
    run.input.source === "repository"
      ? await destination(run.input.repositoryPath)
      : "fixture";
  patchRun(id, {
    approval: {
      hash,
      at: new Date().toISOString(),
      destination: target,
      action: "draft-pr",
    },
  });
  event(
    id,
    "review",
    "Maintainer approved this exact candidate hash and destination for a draft PR.",
  );
  return getRun(id);
}
const locks = new Set<string>();
export async function publish(id: string) {
  if (locks.has(id)) throw new Error("Publication is already in progress.");
  locks.add(id);
  try {
    const run = getRun(id);
    if (run.publication) return run.publication;
    if (!process.env.GITHUB_TOKEN)
      throw new Error(
        "Set GITHUB_TOKEN in .env and restart before publication.",
      );
    if (run.input.source !== "repository")
      throw new Error(
        "Bundled fixtures cannot be published. Connect your own Git repository.",
      );
    if (
      !run.approval ||
      Date.now() - Date.parse(run.approval.at) > 15 * 60 * 1000
    )
      throw new Error(
        "Approval is missing or expired. Review and approve the candidate again.",
      );
    if (run.approval.hash !== (await hashCandidate(id, run.changes)))
      throw new Error("Candidate content changed after approval.");
    const repo = await authorizedRepo(run.input.repositoryPath);
    const { stdout } = await exec("git", [
      "-C",
      repo,
      "remote",
      "get-url",
      "origin",
    ]);
    const match =
      /^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)([\w.-]+)\/([\w.-]+?)(?:\.git)?$/.exec(
        stdout.trim(),
      );
    if (!match)
      throw new Error("Publication supports a GitHub origin remote only.");
    const name = `${match[1]}/${match[2]}`;
    if (run.approval.action !== "draft-pr" || run.approval.destination !== name)
      throw new Error(
        "Publication destination changed or approval is not for a draft PR. Review again.",
      );
    const repository = await api(`/repos/${name}`);
    const base = repository.default_branch;
    const head = await api(
      `/repos/${name}/git/ref/heads/${encodeURIComponent(base)}`,
    );
    if (head.object.sha !== run.baseSha)
      throw new Error(
        "Default branch changed or differs from the investigated revision. Create a new investigation on the current base.",
      );
    const branch = `dawnpatch/${id}`;
    const prs = await api(
      `/repos/${name}/pulls?head=${match[1]}:${encodeURIComponent(branch)}&state=all`,
    );
    if (prs.length) {
      const publication = { url: prs[0].html_url, branch };
      patchRun(id, { publication, status: "completed" });
      return publication;
    }
    const treeBase = await api(`/repos/${name}/git/commits/${run.baseSha}`);
    const tree = await api(`/repos/${name}/git/trees`, "POST", {
      base_tree: treeBase.tree.sha,
      tree: await Promise.all(
        [...new Set(run.changes.map((c) => c.file))].map(async (file) => ({
          path: file,
          mode: "100644",
          type: "blob",
          content: await fs.readFile(
            path.join(workspace(id, "candidate"), file),
            "utf8",
          ),
        })),
      ),
    });
    let commitSha = getKV(`publication:${id}`);
    if (!commitSha) {
      const commit = await api(`/repos/${name}/git/commits`, "POST", {
        message: `fix: ${run.input.title}`,
        tree: tree.sha,
        parents: [run.baseSha],
      });
      commitSha = commit.sha;
      setKV(`publication:${id}`, commitSha!);
    }
    let existing;
    try {
      existing = await api(
        `/repos/${name}/git/ref/heads/${encodeURIComponent(branch)}`,
      );
    } catch (e) {
      if (!(e as Error).message.includes("(404)")) throw e;
    }
    if (existing) {
      if (existing.object.sha !== commitSha)
        throw new Error("Publication branch exists with unexpected content.");
    } else
      await api(`/repos/${name}/git/refs`, "POST", {
        ref: `refs/heads/${branch}`,
        sha: commitSha,
      });
    const pr = await api(`/repos/${name}/pulls`, "POST", {
      title: `fix: ${run.input.title}`,
      head: branch,
      base,
      draft: true,
      body: `## DawnPatch investigation\n\n${run.diagnosis?.summary}\n\nBaseline fails and candidate passes the configured browser assertions. This is not a claim of complete regression coverage.\n\nBase: ${run.baseSha}\nCandidate: ${run.candidateHash}\nModel: ${run.usage.model}\n\n${run.input.issueUrl ? `Related issue: ${run.input.issueUrl}` : ""}\n\nReviewed locally before publication.`,
    });
    const publication = { url: pr.html_url, branch };
    patchRun(id, { publication, status: "completed" });
    event(id, "published", "Draft PR created: " + pr.html_url);
    return publication;
  } finally {
    locks.delete(id);
  }
}
