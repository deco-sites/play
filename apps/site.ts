import website, { Props } from "apps/website/mod.ts";
import { AppContext as AC, App } from "deco/mod.ts";

import manifest, { Manifest } from "../manifest.gen.ts";

type WebSiteApp = ReturnType<typeof website>;
export default function Site(
  state: Props,
): App<Manifest, Props, [
  WebSiteApp,
]> {
  return {
    state,
    manifest,
    dependencies: [
      website(state),
    ],
  };
}

export type Storefront = ReturnType<typeof Site>;
export type AppContext = AC<Storefront>;
export { onBeforeResolveProps } from "apps/compat/$live/mod.ts";
