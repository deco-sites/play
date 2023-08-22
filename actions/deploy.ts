import { ManifestEntry } from "https://denopkg.com/denoland/deployctl@1.8.0/src/utils/api_types.ts";
import { calculateGitSha1 } from "https://denopkg.com/denoland/deployctl@1.8.0/src/utils/walk.ts";
import { AppContext, PlayOptions } from "../apps/site.ts";

const denoJson = await Deno.readFile("./play.deno.json");
export default async function Deploy(
  { playId }: PlayOptions,
  _req: Request,
  ctx: AppContext,
): Promise<void> {
  const importMap = await ctx.invoke("play/loaders/import_map.ts");
  const arrBuffer = await importMap.arrayBuffer();
  const importMapData = new Uint8Array(arrBuffer);
  const client = await ctx.denoDeployClient();
  const files = [importMapData, denoJson];
  const entries: Record<string, ManifestEntry> = {
    "deno.json": {
      kind: "file",
      gitSha1: await calculateGitSha1(denoJson),
      size: denoJson.byteLength,
    },
    "import_map.json": {
      kind: "file",
      gitSha1: await calculateGitSha1(importMapData),
      size: importMapData.byteLength,
    },
  };
  await client.projectNegotiateAssets(playId, {
    entries,
  });

  const events = client.pushDeploy(playId, {
    importMapUrl:
      `https://deco-sites-play-pxvm147a5pjg.deno.dev/live/invoke/play/loaders/import_map.ts`,
    production: true,
    manifest: {
      entries,
    },
    url:
      `https://deco-sites-play-pxvm147a5pjg.deno.dev/live/invoke/play/loaders/main.ts?playId=${playId}`,
  }, files);

  for await (const event of events) {
    console.log(JSON.stringify(event));
  }
}
