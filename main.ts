import { Hypervisor } from "./hypervisor.ts";
import "deco/plugins/deco.ts";

const hypervisor = new Hypervisor();

Deno.serve(hypervisor.fetch.bind(hypervisor));
