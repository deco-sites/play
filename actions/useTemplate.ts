import { AppContext, File, PlayOptions } from "../apps/site.ts";

const baseSite: File[] = [{
  content: `
import type { App, AppContext as AC } from "deco/types.ts";
import type { Manifest } from "play/manifest.gen.ts";
import manifest from "play/manifest.gen.ts";
import { default as sourceMapFor } from "play/commons.tsx";

export interface State {
    url: string;
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
  location: ["loaders", "productLoader.ts"],
  content: `

export interface Product {
  name: string;
  price: number;
}
export interface Props {
  product: Product;
}

export default function ProductLoader({product}: Props): Product {
  return product;
}
`
},{
  location: ["sections", "MySection.tsx"],
  content: `

import { Product } from "./loaders/productLoader.ts";
/**
 * @title {{{myProp}}}
 */
export interface Props {
    /**
     * @title The property
     * @description This is a property
     */
    product: Product;
}

export default function MySection({ product }: Props) {
    return <><span>{product.name}</span><span>{product.price}</span></>;
}
`,
}];

export default async function useTemplate(
  { playId }: PlayOptions,
  _req: Request,
  ctx: AppContext,
) {
  await Promise.all(
    baseSite.map((file) =>
      ctx.invoke("play/actions/files/createOrEdit.ts", {
        file,
        playId,
      })
    ),
  );
}
