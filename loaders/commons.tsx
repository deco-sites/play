import { PlayOptions } from "../apps/site.ts";
export default function commons(
  { playId }: PlayOptions,
  _req: Request,
) {
  return new Response(
    `
import { buildSourceMapWith } from "deco/blocks/utils.tsx";
import type { AppManifest } from "deco/blocks/app.ts";

const currentUrl = new URL(import.meta.url).origin;

const urlFromBlock = (block: string) => {
  const [playId, ...location] = block.split("/");
  const props = encodeURIComponent(
    btoa(JSON.stringify({ location, playId })),
  )

  return currentUrl + "/live/invoke/play/loaders/files/serve.tsx?props=" + props;
}
const sourceMapFor = (manifest: AppManifest) => buildSourceMapWith(manifest, urlFromBlock);
export default sourceMapFor;
  `,
    { status: 200, headers: { "content-type": "application/typescript" } },
  );
}
