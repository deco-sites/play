import { AppContext, File, PlayOptions } from "../apps/site.ts";

const baseSiteForPlayId = (playId: string): File[] => [{
  content: `
import type { App, AppContext as AC } from "deco/types.ts";
import type { Manifest } from "/live/invoke/deco-sites/play/loaders/manifest.gen.ts?playId=${playId}";
import manifest from "/live/invoke/deco-sites/play/loaders/manifest.gen.ts?playId=${playId}";

export interface State {
    url: string;
}

export default function App(
    state: State,
): App<Manifest, State> {
    return {
        manifest,
        state,
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
      ctx.invoke("deco-sites/play/actions/files/createOrEdit.ts", {
        file,
        playId,
      })
    ),
  );
}
