/// <reference no-default-lib="true"/>
/// <reference lib="dom" />
/// <reference lib="deno.ns" />
/// <reference lib="esnext" />

import { plugin as tailwindPlugin } from "deco-sites/std/plugins/tailwind/mod.ts";
import decoPlugin from "deco/plugins/deco.ts";
import partytownPlugin from "partytown/mod.ts";

import { defineConfig } from "$fresh/server.ts";
import provider from "./provider/options.ts";
import tailwind from "./tailwind.config.ts";

export default defineConfig({
  build: { target: ["chrome99", "firefox99", "safari12"] },
  plugins: [
    // deno-lint-ignore no-explicit-any
    tailwindPlugin(tailwind as any),
    decoPlugin(provider),
    partytownPlugin(),
  ],
});
