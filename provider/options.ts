import { Release } from "deco/engine/releases/provider.ts";
import { InitOptions } from "deco/plugins/deco.ts";
import decofiles from "./decofiles.json" with { type: "json" };

const bySiteConfig: Record<
  string,
  { decofile: Record<string, unknown>; manifestImportString: string }
> = decofiles;

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
    },
  };
};
export default async function provider(
  req: Request,
): Promise<InitOptions> {
  const url = new URL(req.url);
  const hostname = url.searchParams.get("__host") ?? url.hostname; // format => sites-${site}-${hash}.decocdn.com
  const siteDNSPrefix = hostname.split(".")?.[0];
  const [_ignoreSites, ...parts] = siteDNSPrefix?.split("-") ?? [];
  if (!Array.isArray(parts) || parts.length < 2) {
    throw new Error("could not route request");
  }
  const withoutLast = parts.slice(0, -1);
  const siteName = withoutLast.join("-");
  return optionsCache[siteName] ??= {
    release: fromValue({ inner: bySiteConfig[siteName]?.decofile ?? {} }),
    manifest: await import(bySiteConfig[siteName]?.manifestImportString).then(
      (imp) => imp.default,
    ),
  };
}
