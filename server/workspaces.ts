import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { config, dataDir } from "./config.ts";
import type { Run, Change } from "../shared/types.ts";
import { fixtureHTML } from "./fixtures.ts";
import { createTwoFilesPatch } from "diff";
export const exec = promisify(execFile);
export const workspace = (id: string, side = "baseline") =>
  path.join(dataDir, "runs", id, side);
export const artifactDir = (id: string) =>
  path.join(dataDir, "runs", id, "artifacts");
const deny =
  /(^|\/)(\.git|node_modules|dist|build|\.next|coverage|\.env[^/]*|\.npmrc|\.ssh|\.aws|\.dawnpatch)(\/|$)|\.(pem|key|p12)$/i;
export function allowedFile(file: string) {
  return (
    !deny.test(file.replaceAll("\\", "/")) &&
    !path.isAbsolute(file) &&
    !file.split(/[\\/]/).includes("..") &&
    !file.includes(":") &&
    !/(^|\/)(tests?|__tests__|e2e)(\/|$)|\.(test|spec)\./i.test(
      file.replaceAll("\\", "/"),
    ) &&
    /\.(html|css|scss|js|jsx|ts|tsx|vue|svelte|json|md)$/.test(file) &&
    !/(package(-lock)?\.json|tsconfig[^/]*\.json|vite\.config\.[^/]+)$/i.test(
      file,
    )
  );
}
export function contained(base: string, target: string) {
  const relative = path.relative(base, target);
  return (
    relative === "" ||
    (!relative.startsWith(".." + path.sep) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  );
}
export async function authorizedRepo(repo: string) {
  const actual = await fs.realpath(repo);
  const roots = await Promise.all(config.roots.map((r) => fs.realpath(r)));
  if (!roots.some((r) => contained(r, actual)))
    throw new Error(
      "Repository is outside SOURCE_ROOTS. Add its parent directory to .env, then restart DawnPatch.",
    );
  return actual;
}
export async function prepare(run: Run) {
  const dest = workspace(run.id);
  await fs.mkdir(dest, { recursive: true });
  await fs.mkdir(artifactDir(run.id), { recursive: true });
  if (run.input.source === "fixture") {
    const html = fixtureHTML(run.input.fixture);
    await fs.writeFile(path.join(dest, "index.html"), html);
    return {
      sha: crypto.createHash("sha256").update(html).digest("hex").slice(0, 12),
      name: "dawnpatch/fieldnotes",
    };
  }
  const repo = await authorizedRepo(run.input.repositoryPath);
  const { stdout: sha } = await exec("git", ["-C", repo, "rev-parse", "HEAD"]);
  const { stdout: dirty } = await exec("git", [
    "-C",
    repo,
    "status",
    "--porcelain",
  ]);
  if (dirty.trim())
    throw new Error(
      "Repository has uncommitted changes. Commit or stash them before investigating so evidence matches the pinned revision.",
    );
  const { stdout } = await exec("git", ["-C", repo, "ls-files", "-z"], {
    maxBuffer: 2_000_000,
  });
  let bytes = 0,
    count = 0;
  for (const file of stdout.split("\0").filter(Boolean)) {
    if (deny.test(file)) continue;
    if (++count > 1500)
      throw new Error("Repository exceeds the 1,500-file investigation limit.");
    const src = path.join(repo, file);
    const st = await fs.lstat(src);
    if (!st.isFile() || st.isSymbolicLink()) continue;
    bytes += st.size;
    if (bytes > 20_000_000)
      throw new Error("Repository source exceeds the 20 MB limit.");
    const real = await fs.realpath(src);
    if (!contained(repo, real))
      throw new Error("Source file escapes repository.");
    const output = path.join(dest, file);
    await fs.mkdir(path.dirname(output), { recursive: true });
    await fs.copyFile(src, output);
  }
  return { sha: sha.trim(), name: path.basename(repo) };
}
export async function contextFiles(run: Run) {
  const base = workspace(run.id);
  const result: { file: string; content: string }[] = [];
  let total = 0;
  async function walk(dir: string) {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      if (total > 40000 || result.length >= 25) return;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else {
        const file = path.relative(base, full).replaceAll("\\", "/");
        if (!allowedFile(file)) continue;
        const text = await fs.readFile(full, "utf8");
        if (text.length > 14000) continue;
        total += text.length;
        result.push({ file, content: text });
      }
    }
  }
  await walk(base);
  return result;
}
export async function applyChanges(run: Run, changes: Change[]) {
  if (!changes.length)
    throw new Error("The model did not propose an applicable patch.");
  if (changes.length > 5) throw new Error("Patch exceeds the five-edit limit.");
  const base = workspace(run.id),
    candidate = workspace(run.id, "candidate");
  await fs.cp(base, candidate, {
    recursive: true,
    filter: (src) => !deny.test(path.relative(base, src).replaceAll("\\", "/")),
  });
  for (const change of changes) {
    if (!allowedFile(change.file))
      throw new Error(`Patch path is not permitted: ${change.file}`);
    if (change.replace.length > 20000 || !change.search.trim())
      throw new Error("Patch exceeds edit limits.");
    const target = path.resolve(candidate, change.file);
    if (!contained(candidate, target))
      throw new Error("Patch escapes isolated workspace.");
    const st = await fs.lstat(target);
    if (!st.isFile() || st.isSymbolicLink())
      throw new Error("Only existing regular source files may be changed.");
    const before = await fs.readFile(target, "utf8");
    if (before.split(change.search).length !== 2)
      throw new Error(`Patch must match exactly once in ${change.file}.`);
    await fs.writeFile(target, before.replace(change.search, change.replace));
  }
  return hashCandidate(run.id, changes);
}
export async function hashCandidate(id: string, changes: Change[]) {
  const hash = crypto.createHash("sha256");
  for (const file of [...new Set(changes.map((c) => c.file))].sort()) {
    hash.update(file);
    hash.update(await fs.readFile(path.join(workspace(id, "candidate"), file)));
  }
  return hash.digest("hex");
}
export async function patchText(run: Run) {
  let result = "";
  for (const file of [...new Set(run.changes.map((c) => c.file))]) {
    const before = await fs.readFile(
      path.join(workspace(run.id), file),
      "utf8",
    );
    const after = await fs.readFile(
      path.join(workspace(run.id, "candidate"), file),
      "utf8",
    );
    result +=
      `diff --git a/${file} b/${file}\n` +
      createTwoFilesPatch(`a/${file}`, `b/${file}`, before, after);
  }
  return result;
}
const containers = new Map<string, string[]>();
export async function cleanup(id: string) {
  for (const name of containers.get(id) || []) {
    await exec("docker", ["rm", "-f", name], { timeout: 15000 }).catch(
      () => {},
    );
  }
  containers.delete(id);
}
export async function preview(run: Run, side: "baseline" | "candidate") {
  if (run.input.recipe === "html") {
    return `http://127.0.0.1:${config.port + 1}/fixture/${run.id}/${side}/index.html`;
  }
  try {
    await exec("docker", ["info", "--format", "{{.ServerVersion}}"], {
      timeout: 10000,
    });
  } catch {
    throw new Error(
      "Docker Desktop is not running. Start its Linux engine to build repositories in isolated containers. No project scripts were executed on the host.",
    );
  }
  const name = `dawnpatch-${run.id.slice(0, 8)}-${side}`;
  const command =
    run.input.recipe === "vite"
      ? "npm ci --no-audit --no-fund && npm run build && npm run preview -- --host 0.0.0.0 --port 4173"
      : "npm ci --no-audit --no-fund && npm run build && npx --no-install next start --hostname 0.0.0.0 --port 4173";
  await exec(
    "docker",
    [
      "run",
      "-d",
      "--name",
      name,
      "--cap-drop=ALL",
      "--security-opt=no-new-privileges",
      "--memory=2g",
      "--cpus=2",
      "--pids-limit=256",
      "--publish",
      "127.0.0.1::4173",
      "--mount",
      `type=bind,source=${workspace(run.id, side)},target=/app`,
      "--workdir",
      "/app",
      config.image,
      "sh",
      "-c",
      command,
    ],
    { timeout: 120000 },
  );
  containers.set(run.id, [...(containers.get(run.id) || []), name]);
  const { stdout } = await exec("docker", ["port", name, "4173/tcp"]);
  const port = stdout.trim().split(":").pop();
  const url = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 150; i++) {
    if ((await import("./db.ts")).getRun(run.id).status === "cancelled")
      throw new Error("Investigation cancelled.");
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(1500) });
      if (r.ok) return url;
    } catch {}
    await new Promise((r) => setTimeout(r, 2000));
  }
  const { stdout: log } = await exec("docker", ["logs", "--tail", "25", name]);
  throw new Error(
    `Sandbox build/preview did not become ready within five minutes. ${log.slice(-2000)}`,
  );
}
