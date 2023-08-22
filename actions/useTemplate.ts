import { AppContext, File, PlayOptions } from "../apps/site.ts";

const baseSiteForPlayId = (playId: string): File[] => [{
  content: `
import type { App, AppContext as AC } from "deco/types.ts";
import type { Manifest } from "/live/invoke/play/loaders/manifest.gen.ts?playId=${playId}";
import manifest from "/live/invoke/play/loaders/manifest.gen.ts?playId=${playId}";
import { default as sourceMapFor } from "/live/invoke/play/loaders/commons.tsx?playId=${playId}";

export interface State {
    url: string;
}
const currentUrl = new URL(import.meta.url).origin;

const urlFromBlock = (block: string) => {
  const [playId, ...location] = block.split("/");
  const props = encodeURIComponent(
    btoa(JSON.stringify({ location, playId })),
  )

  return currentUrl + "/live/invoke/play/loaders/files/serve.tsx?props=" + props;
}

export default function App(
    state: State,
): App<Manifest, State> {
    return {
        manifest,
        state,
        sourceMap: sourceMapFor(manifest)
    };
}

export type AppContext = AC<ReturnType<typeof App>>;
  `,
  location: ["apps", "site.ts"],
}, {
  location: ["sections", "MySection.tsx"],
  content: `
/**
 * @title {{{myProp}}}
 */
export interface Props {
    /**
     * @title The property
     * @description This is a property
     */
    myProp: string;
}

export default function MySection({ myProp }: Props) {
    return <div>{myProp}</div>;
}
`,
}];

export default async function useTemplate(
  { playId }: PlayOptions,
  _req: Request,
  ctx: AppContext,
) {
  const files = baseSiteForPlayId(playId);
  await Promise.all(
    files.map((file) =>
      ctx.invoke("play/actions/files/createOrEdit.ts", {
        file,
        playId,
      })
    ),
  );
}
