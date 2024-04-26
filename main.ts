import "deco/plugins/deco.ts";
import { formatLog } from "deco/utils/log.ts";
import { parse } from "std/flags/mod.ts";
import * as colors from "std/fmt/colors.ts";
// import { cloudflared } from "./deps.ts";
import { Hypervisor } from "./hypervisor.ts";
import { portPool } from "./workers/portpool.ts";
const parsedArgs = parse(Deno.args, {
  string: ["build-cmd"],
  boolean: ["expose"],
});
const runCommand = parsedArgs["_"];
if (import.meta.main && !runCommand || runCommand.length === 0) {
  console.error("No command provided.");
  Deno.exit(1);
}

const APP_PORT = portPool.get();

// let shutdown: (() => void) | undefined = undefined;
const [cmd, ...args] = runCommand as string[];
const [buildCmdStr, ...buildArgs] = parsedArgs["build-cmd"]?.split(" ") ?? [];

const buildCmd = new Deno.Command(buildCmdStr, {
  args: buildArgs,
  stdout: "inherit",
  stderr: "inherit",
});
const runCmd = new Deno.Command(cmd, {
  args,
  stdout: "inherit",
  stderr: "inherit",
  env: { PORT: `${APP_PORT}` },
});
const hypervisor = new Hypervisor({
  run: runCmd,
  build: buildCmd,
  port: APP_PORT,
});

const appPort = Deno.env.get("APP_PORT");
Deno.serve(
  {
    port: appPort ? +appPort : 8000,
    onListen: (addr) => {
      const address = `http://${addr.hostname}:${addr.port}`;
      try {
        if (parsedArgs["expose"]) {
          //   await cloudflared.install(cloudflared.bin);
          //   const { url, connections, stop } = cloudflared.tunnel({
          //     "--url": address,
          //   });

          //   // wait for the all 4 connections to be established
          //   await Promise.all(connections);
          //   console.log(
          //     colors.green(`Server running on ${await url} -> ${address}`),
          //   );
          //   shutdown = stop;
        } else {
          console.log(
            colors.green(`Server running on ${address}`),
          );
        }
      } catch (err) {
        console.log(err);
      }
    },
  },
  (req) => {
    let response: Promise<Response> | null = null;
    const begin = performance.now();
    try {
      return response = hypervisor.fetch(req);
    } finally {
      response?.then((resp) => {
        const logline = formatLog({
          begin,
          status: resp.status,
          url: new URL(req.url),
        });
        console.log(
          `  ${colors.gray(logline)}`,
        );
      });
    }
  },
);

const signals: Partial<Record<Deno.Signal, boolean>> = {
  SIGINT: true, //
  SIGTERM: true, //
};

for (const [_signal, shouldExit] of Object.entries(signals)) {
  const signal = _signal as Deno.Signal;
  Deno.addSignalListener(signal, () => {
    hypervisor.proxySignal(signal);
    if (shouldExit) {
      // shutdown?.();
      hypervisor.shutdown?.();
      Deno.exit(0);
    }
  });
}
