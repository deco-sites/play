import { Hypervisor } from "./hypervisor.ts";
import * as colors from "std/fmt/colors.ts";
import "deco/plugins/deco.ts";
import { formatLog } from "deco/utils/log.ts";

const hypervisor = new Hypervisor();

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
          colors.bgBlue(`[x]`),
          formatLog({ begin, status: resp.status, url: new URL(req.url) }),
        );
      });
    }
  },
);
