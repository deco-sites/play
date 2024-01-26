import { Handler } from "deco/blocks/handler.ts";
import { Context } from "deco/deco.ts";
import { newContext } from "deco/engine/manifest/manifest.ts";
import { Release } from "deco/engine/releases/provider.ts";
import { AppManifest } from "deco/mod.ts";
import { handler } from "deco/runtime/fresh/routes/entrypoint.tsx";
import manifest from "../manifest.gen.ts";

export interface SiteContext {
  site: string;
  release: Release;
}

export interface Props {
  context: SiteContext;
}

export default function (
  { context: { release, site } }: Props,
): Handler {
  const rootManifest = {
    baseUrl: manifest.baseUrl,
    name: manifest.name,
    apps: { ...manifest.apps },
  } as AppManifest;
  return async (req, ctx) => {
    return Context.bind(
      { ...await newContext(rootManifest, undefined, release), site },
      handler.GET as Handler,
    )(req, ctx);
  };
}
