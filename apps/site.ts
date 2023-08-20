import type { App, AppContext as AC } from "$live/types.ts";
import { default as play, State } from "../../deco-play/app/mod.ts";
import type { Manifest } from "../manifest.gen.ts";
import manifest from "../manifest.gen.ts";

export default function Site(
  state: State,
): App<Manifest, State, [ReturnType<typeof play>]> {
  return {
    manifest,
    state,
    dependencies: [play(state)],
  };
}

export type AppContext = AC<ReturnType<typeof Site>>;
