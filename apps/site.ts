import website, { Props as WebSiteProps } from "apps/website/mod.ts";
import { App, AppContext as AC } from "deco/mod.ts";

import manifest, { Manifest } from "../manifest.gen.ts";

type WebSiteApp = ReturnType<typeof website>;
export default function Site(
  props: WebSiteProps,
): App<Manifest, WebSiteProps, [
  WebSiteApp,
]> {
  return {
    state: props,
    manifest,
    dependencies: [
      website(props),
    ],
  };
}

export type Storefront = ReturnType<typeof Site>;
export type AppContext = AC<Storefront>;
export { onBeforeResolveProps } from "apps/compat/$live/mod.ts";
