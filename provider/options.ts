import * as decohub from "apps/decohub/mod.ts";
import { randomSiteName } from "deco/engine/manifest/utils.ts";
import { fromJSON } from "deco/engine/releases/fetcher.ts";
import { InitOptions } from "deco/plugins/deco.ts";
import { dirname, join } from "std/path/mod.ts";

const optionsCache: Record<string, InitOptions> = {};
let localhostSite: string;
export default function provider(
  req: Request,
): Promise<InitOptions> {
  const url = new URL(req.url);
  const hostname = url.searchParams.get("__host") ?? url.hostname; // format => {site}.deco.site
  let siteName: undefined | string;
  if (hostname === "localhost") {
    siteName = localhostSite ??= randomSiteName();
  } else {
    siteName = hostname.split(".")?.[0] ?? randomSiteName();
  }
  const decohubName = `${siteName}/apps/decohub.ts`;
  // the entrypoint of all apps is the decohub
  // you should add an app array on decohub
  return Promise.resolve(
    optionsCache[siteName] ??= {
      site: {
        name: siteName,
        namespace: siteName,
      },
      release: fromJSON({}),
      importMap: {
        imports: {
          [decohubName]: import.meta.resolve("apps/decohub/mod.ts"),
        },
      },
      manifest: {
        apps: {
          [decohubName]: decohub,
        },
        baseUrl: join(join(dirname(import.meta.url), ".."), `${siteName}.ts`),
        name: `site`,
      },
    },
  );
}
