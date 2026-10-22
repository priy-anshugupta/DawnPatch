import { Client, Connection } from "@temporalio/client";
import { config } from "../config.ts";
export async function temporalClient() {
  return new Client({
    connection: await Connection.connect({
      address: config.temporal,
      connectTimeout: "5 seconds",
    }),
    namespace: config.namespace,
  });
}
