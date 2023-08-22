import { ManifestEntry } from "https://denopkg.com/denoland/deployctl@1.8.0/src/utils/api_types.ts";
import { calculateGitSha1 } from "https://denopkg.com/denoland/deployctl@1.8.0/src/utils/walk.ts";
import { AppContext, PlayOptions } from "../apps/site.ts";

const denoJson = await Deno.readFile("./play.deno.json");
export default async function Deploy(
  { playId }: PlayOptions,
  _req: Request,
  ctx: AppContext,
): Promise<void> {
  const client = await ctx.denoDeployClient();
  const entries: Record<string, ManifestEntry> = {
    "deno.json": {
      kind: "file",
      gitSha1: await calculateGitSha1(denoJson),
      size: denoJson.byteLength,
    },
  };
  const files = [];
  await client.projectNegotiateAssets(playId, {
    entries,
  });
  files.push(denoJson);

  const events = client.pushDeploy(playId, {
    importMapUrl:
      `https://deco-sites-play-19xjgnj0ss9g.deno.dev/live/invoke/play/loaders/import_map.ts`,
    production: true,
    manifest: {
      entries,
    },
    url:
      `https://deco-sites-play-19xjgnj0ss9g.deno.dev/live/invoke/play/loaders/main.ts?playId=${playId}`,
  }, files);

  for await (const event of events) {
    console.log(JSON.stringify(event));
  }
}
