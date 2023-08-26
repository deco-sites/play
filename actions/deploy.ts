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
  const files: Uint8Array[] = [];
  const entries = {
    "/src/deno.json": {
      kind: "file",
      gitSha1: await calculateGitSha1(denoJson),
      size: denoJson.byteLength,
    },
    "/src/import_map.json": {
      kind: "file",
      gitSha1: await calculateGitSha1(importMapData),
      size: importMapData.byteLength,
    },
  } satisfies Record<string, ManifestEntry>;
  const neededHashes = await client.projectNegotiateAssets(playId, {
    entries,
  });

  for (const hash of neededHashes) {
    if (hash === entries["/src/deno.json"].gitSha1) {
      files.push(denoJson);
    } else {
      files.push(importMapData);
    }
  }

  const events = client.pushDeploy(playId, {
    importMapUrl:
      `${ctx.playDomain}/live/invoke/play/loaders/import_map.ts?v=${Math.random()}`,
    production: true,
    manifest: {
      entries,
    },
    url: `${ctx.playDomain}/live/invoke/play/loaders/main.ts?playId=${playId}`,
  }, files);

  for await (const event of events) {
    console.log(JSON.stringify(event));
  }
}
