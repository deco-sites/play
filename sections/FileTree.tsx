import { SectionProps } from "deco/mod.ts";
import { PlayContext } from "../functions/context.ts";
import { AppContext } from "../apps/site.ts";

export default function FileTree(
  { files, context }: SectionProps<typeof loader>,
) {
  return (
    <>
      <span>Files</span>
      <form
        action={`/live/invoke/play/actions/useTemplate.ts`}
        method="GET"
      >
        <input type="hidden" name="playId" value={context.id} />
        <button type="submit">Use template</button>
      </form>
      <form
        action={`/live/invoke/play/actions/deploy.ts`}
        method="GET"
      >
        <input type="hidden" name="playId" value={context.id} />
        <button type="submit">Deploy</button>
      </form>
      {files.map((file) => {
        return (
          <div class="px-4 py-2 bg-white rounded-b-lg dark:bg-gray-800 h-full w-full">
            <label for="editor" class="sr-only">
              {file.location.join("/")}
            </label>
            <textarea
              id="editor"
              rows={8}
              class="block w-full px-0 text-sm text-gray-800 bg-white border-0 dark:bg-gray-800 focus:ring-0 dark:text-white dark:placeholder-gray-400"
              placeholder="Write an article..."
              required
            >
              {file.content}
            </textarea>
          </div>
        );
      })}
    </>
  );
}

export interface Props {
  context: PlayContext;
}

export const loader = async (props: Props, _req: Request, ctx: AppContext) => {
  return {
    ...props,
    files: props?.context?.id
      ? await ctx.fs.forPlay(props.context.id).list()
      : [],
  };
};
