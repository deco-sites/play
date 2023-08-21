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
  const id: string = uniqueNamesGenerator({
    dictionaries: [animals, adjectives, numberDictionary],
    length: 3,
  });

  await ctx.invoke("deco-sites/play/actions/files/createOrEdit.ts", {
    file: {
      location: ["sections", "MySection.tsx"],
      content: `
  /**
   * @title {{{myProp}}}
   * /
  export interface Props {
      /**
       * @title The property
       * @description This is a property
       * /
      myProp: string;
  }
  
  export default function MySection({ myProp }: Props) {
      return <div>{myProp}</div>;
  }
  `,
    },
    playId: id,
  });

  await ctx.invoke("deco-sites/play/actions/deploy.ts", {
    playId: id,
  });
  return {
    id,
  };
}
