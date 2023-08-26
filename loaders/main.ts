export interface MainOptions {
  playId: string;
}

export default function main(
  { playId }: MainOptions,
  _req: Request,
) {
  const content = `
/// <reference no-default-lib="true"/>
/// <reference lib="dom" />
/// <reference lib="deno.ns" />
/// <reference lib="esnext" />

import { start } from "$fresh/server.ts";
import manifest from "./fresh.gen.ts?playId=${playId}";
import decoManifest from "./manifest.gen.ts?playId=${playId}";
import decoPlugin from "deco/plugins/deco.ts";
import { context } from "deco/live.ts";
import { default as sourceMapFor } from "play/commons.tsx?playId=${playId}";
import { walk } from "std/fs/mod.ts";

context.isDeploy = true;

const readTextFile = Deno.readTextFile;
Deno.readTextFile = (
  path: string | URL,
  options?: Parameters<typeof Deno.readTextFile>[1],
) => {
  const urlString = path.toString();
  if (urlString.endsWith("deno.json")) {
    return Promise.resolve(JSON.stringify({
      "importMap": "./import_map.json",
      "compilerOptions": {
        "jsx": "react-jsx",
        "jsxImportSource": "preact"
      }
    }));
  }
  if (urlString.startsWith("http")) {
    return fetch(urlString).then(response => response.text());
  }
  const serveFileUrl = new URL(import.meta.url).origin + "/live/invoke/play/loaders/files/serve.tsx?props=";
  return fetch(serveFileUrl + (btoa(JSON.stringify({ location: urlString.split("/"), playId: "${playId}" })))).then(response => response.text());
};


await start(manifest, {
  plugins: [
    decoPlugin({
      sourceMap: sourceMapFor(decoManifest),
      manifest: decoManifest,
      site: { namespace: "${playId}" },
    }),
  ],
});
    
  `;
  return new Response(content, {
    status: 200,
    headers: { "content-type": "application/typescript" },
  });
}
