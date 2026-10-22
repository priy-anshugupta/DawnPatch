import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
fs.mkdirSync(".dawnpatch", { recursive: true });
const local = path.resolve(
  ".dawnpatch/bin",
  process.platform === "win32" ? "temporal.exe" : "temporal",
);
const child = spawn(
  fs.existsSync(local) ? local : "temporal",
  [
    "server",
    "start-dev",
    "--ip",
    "127.0.0.1",
    "--db-filename",
    path.resolve(".dawnpatch/temporal.db"),
  ],
  { stdio: "inherit", windowsHide: true },
);
child.on("error", () => {
  console.error(
    "Install the official Temporal CLI on PATH or in .dawnpatch/bin. See https://docs.temporal.io/cli",
  );
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code || 0;
});
