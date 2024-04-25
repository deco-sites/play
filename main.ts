import { Hypervisor } from "./hypervisor.ts";
import * as colors from "std/fmt/colors.ts";
import "deco/plugins/deco.ts";
import { formatLog } from "deco/utils/log.ts";
import { parse } from "std/flags/mod.ts";
import { portPool } from "./workers/portpool.ts";

const COMMAND = parse(Deno.args)["_"];
if (import.meta.main && !COMMAND || COMMAND.length === 0) {
  console.error("No command provided.");
  Deno.exit(1);
}

const APP_PORT = portPool.get();

const [cmd, ...args] = COMMAND as string[];

const command = new Deno.Command(cmd, {
  args,
  stdout: "inherit",
  stderr: "inherit",
  env: { PORT: `${APP_PORT}` },
});
const hypervisor = new Hypervisor(command, APP_PORT);

const appPort = Deno.env.get("APP_PORT");
Deno.serve(
  { port: appPort ? +appPort : 8000 },
  (req) => {
    let response: Promise<Response> | null = null;
    const begin = performance.now();
    try {
      return response = hypervisor.fetch(req);
    } finally {
      response?.then((resp) => {
        console.log(
          colors.gray(`~`),
          formatLog({ begin, status: resp.status, url: new URL(req.url) }),
        );
      });
    }
  },
);
Deno.addSignalListener("SIGINT", () => {
  hypervisor.shutdown();
  Deno.exit();
});
