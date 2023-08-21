import {
  adjectives,
  animals,
  NumberDictionary,
  uniqueNamesGenerator,
} from "https://esm.sh/unique-names-generator@4.7.1";
import { AppContext } from "../apps/site.ts";

export interface Playground {
  id: string;
}
const numberDictionary = NumberDictionary.generate({ min: 10, max: 99 });

export default async function newPlayground(
  _props: unknown,
  _req: Request,
  ctx: AppContext,
) {
  const id = uniqueNamesGenerator({
    dictionaries: [animals, adjectives, numberDictionary],
    length: 3,
  });

  await ctx.invoke("deco-sites/play/actions/useTemplate.ts", { playId: id });

  await ctx.invoke("deco-sites/play/actions/deploy.ts", {
    playId: id,
  });
  return {
    id,
  };
}
