import { Worker, NativeConnection } from "@temporalio/worker";
import { fileURLToPath } from "node:url";
import { config } from "../config.ts";
import * as activities from "./activities.ts";
const worker = await Worker.create({
  connection: await NativeConnection.connect({ address: config.temporal }),
  namespace: config.namespace,
  taskQueue: config.queue,
  workflowsPath: fileURLToPath(new URL("./workflows.ts", import.meta.url)),
  activities,
  maxConcurrentActivityTaskExecutions: 1,
});
console.log("DawnPatch Temporal worker ready on " + config.queue);
await worker.run();
