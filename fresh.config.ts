/// <reference no-default-lib="true"/>
/// <reference lib="dom" />
/// <reference lib="deno.ns" />
/// <reference lib="esnext" />

import plugins from "deco-sites/std/plugins/mod.ts";
import partytownPlugin from "partytown/mod.ts";

import { defineConfig } from "$fresh/server.ts";
import provider from "./provider/options.ts";
import tailwind from "./tailwind.config.ts";

export default defineConfig({
  build: { target: ["chrome99", "firefox99", "safari12"] },
  plugins: [
    ...plugins(
      provider,
      // deno-lint-ignore no-explicit-any
      tailwind as any,
    ),
    partytownPlugin(),
  ],
});
