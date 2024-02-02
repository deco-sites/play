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
const sitePerHost: Record<string, string> = {};
export default function provider(
  req: Request,
): Promise<InitOptions> {
  const url = new URL(req.url);
  const hostname = url.searchParams.get("__host") ?? url.hostname; // format => sites-${site}-${hash}.decocdn.com
  const siteDNSPrefix = hostname.split(".")?.[0];
  const [_ignoreSites, ...parts] = siteDNSPrefix?.split("-") ?? [];
  let siteName: undefined | string;
  if (!Array.isArray(parts) || parts.length < 2) {
    sitePerHost[hostname] ??= randomSiteName();
    siteName = sitePerHost[hostname];
  } else {
    const withoutLast = parts.slice(0, -1);
    siteName = withoutLast.join("-");
  }
  const decohubName = `${siteName}/apps/decohub.ts`;
  // the entrypoint of all apps is the decohub
  // you should add an app array on decohub
  return Promise.resolve(
    optionsCache[siteName] ??= {
      release: fromValue({
        inner: {
          decohub: {
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
            __resolveType: `decohub/apps/${siteName}.ts`,
          },
        },
      }),
      sourceMap: {
        [decohubName]: import.meta.resolve("apps/decohub/mod.ts"),
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
