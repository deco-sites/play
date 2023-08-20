import type { App, AppContext as AC } from "$live/types.ts";
import {
  default as play,
  State,
} from "https://denopkg.com/mcandeia/play@0.1.2/app/mod.ts";
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
