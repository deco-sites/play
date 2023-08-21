import { AppContext, PlayOptions } from "../apps/site.ts";

export default async function Deploy(
  { playId }: PlayOptions,
  _req: Request,
  ctx: AppContext,
): Promise<void> {
  const client = await ctx.denoDeployClient();
  const events = client.pushDeploy(playId, {
    importMapUrl: `${ctx.playDomain}/live/invoke/deco-sites/play/loaders/import_map.ts`,
    production: true,
    url: `${ctx.playDomain}/live/invoke/deco-sites/play/loaders/main.ts?playId=${playId}`,
  }, []);

  for await (const event of events) {
    console.log(JSON.stringify(event));
  }
}
