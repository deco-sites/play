import { Hypervisor } from "./hypervisor.ts";
import "deco/plugins/deco.ts";

const hypervisor = new Hypervisor();

const appPort = Deno.env.get("APP_PORT");
Deno.serve(
  { port: appPort ? +appPort : 8000 },
  hypervisor.fetch.bind(hypervisor),
);
