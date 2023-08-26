import { AppContext } from "../apps/site.ts";

/**
 * @title Starts a new Playground.
 */
export default function NewPlayground(_props: unknown, ctx: AppContext) {
  return async (_req: Request) => {
    const playground = await ctx.invoke("play/actions/new.ts");
    return Response.redirect(new URL(`/${playground.id}`, _req.url));
  };
}
