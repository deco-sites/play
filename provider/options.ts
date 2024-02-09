import * as decohub from "apps/decohub/mod.ts";
import { randomSiteName } from "deco/engine/manifest/utils.ts";
import { Release } from "deco/engine/releases/provider.ts";
import { InitOptions } from "deco/plugins/deco.ts";

const optionsCache: Record<string, InitOptions> = {};
export const fromValue = (val: { inner: Record<string, unknown> }): Release => {
  const onChangeCbs: (() => void)[] = [];
  let latestRev = `${Date.now()}`;
  return {
    archived: () => Promise.resolve({}),
    onChange: (cb) => {
      onChangeCbs.push(cb);
    },
    revision: () => Promise.resolve(latestRev),
    state: () => Promise.resolve(val.inner),
    set: (newState, rev) => {
      latestRev = rev ?? `${Date.now()}`;
      val.inner = newState;
      onChangeCbs.forEach((cb) => cb());
      return Promise.resolve();
    },
  };
};
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
      release: fromValue({
        inner: {
          decohub: {
            enableAdmin: true,
            apps: [
              {
                name: siteName,
                __resolveType: "files/loaders/app.ts",
              },
            ],
            __resolveType: decohubName,
          },
          files: {
            __resolveType: "decohub/apps/files.ts",
          },
          admin: {
            __resolveType: "decohub/apps/admin.ts",
          },
          [siteName]: {
            routes: [
              {
                __resolveType: "website/loaders/pages.ts",
              },
            ],
            __resolveType: `decohub/apps/${siteName}.ts`,
          },
        },
      }),
      importMap: {
        imports: {
          [decohubName]: import.meta.resolve("apps/decohub/mod.ts"),
        },
      },
      manifest: {
        apps: {
          [decohubName]: decohub,
        },
        baseUrl: import.meta.url,
        name: siteName,
      },
    },
  );
}
