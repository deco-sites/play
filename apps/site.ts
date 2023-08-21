import type { AppContext as AC, App } from "$live/types.ts";
import {
  Props as WebSiteProps,
  onBeforeResolveProps,
  default as website,
} from "https://denopkg.com/deco-cx/apps@2ec513dbcc1b29edeec411ce99f184481e8e1a86/website/mod.ts";
import {
  Props as PlayProps,
  State,
  default as play,
} from "https://denopkg.com/mcandeia/play@0.1.9/app/mod.ts";
import type { Manifest } from "../manifest.gen.ts";
import manifest from "../manifest.gen.ts";

export { onBeforeResolveProps };
export type Props = WebSiteProps & PlayProps;
export default function Site(
  state: Props,
): App<Manifest, State, [ReturnType<typeof play>, ReturnType<typeof website>]> {
  const playApp = play(state);
  return {
    manifest,
    state: playApp.state,
    dependencies: [playApp, website(state)],
  };
}

export type AppContext = AC<ReturnType<typeof Site>>;
