import website, { Props as WebSiteProps } from "apps/website/mod.ts";
import admin, { Props as AdminProps } from "apps/admin/mod.ts";
import { App, AppContext as AC } from "deco/mod.ts";

import manifest, { Manifest } from "../manifest.gen.ts";

export interface Props extends WebSiteProps {
  admin: AdminProps;
}
type WebSiteApp = ReturnType<typeof website>;
export default function Site(
  props: Props,
): App<Manifest, Props, [
  WebSiteApp,
  ReturnType<typeof admin>,
]> {
  const { admin: adminProps, ...state } = props;
  return {
    state: props,
    manifest,
    dependencies: [
      website(state),
      admin(adminProps),
    ],
  };
}

export type Storefront = ReturnType<typeof Site>;
export type AppContext = AC<Storefront>;
export { onBeforeResolveProps } from "apps/compat/$live/mod.ts";
