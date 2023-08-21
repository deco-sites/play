import type { FunctionContext, LoaderFunction } from "deco/mod.ts";

export interface PlayContext {
  id: string;
}

export interface Props {
  /**
   * @default playId
   * @description Param name to extract from the Request URL
   */
  playParam: string;
}

/**
 * @title Get params from request parameters
 * @description Set param to playId for routes of type /:playId
 */
const playContext: LoaderFunction<
  Props,
  PlayContext,
  FunctionContext
> = (_req, ctx) => {
  return {
    data: { id: ctx.params[ctx.state.$live.playParam ?? "playId"] },
  };
};

export default playContext;
