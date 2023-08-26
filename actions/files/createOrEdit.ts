import type { AppContext, File, PlayOptions } from "../../apps/site.ts";

export interface Props extends PlayOptions {
  file: File;
}
export default async function createOrEdit(
  { file, playId }: Props,
  _req: Request,
  { fs }: AppContext,
): Promise<File> {
  const isTsx = file.location[file.location.length - 1]?.endsWith(".tsx");
  return await fs.forPlay(playId).createOrEdit(
    file.location,
    isTsx && !file.content.includes("jsxImportSource")
      ? `/** @jsxImportSource preact */\n${file.content}`
      : file.content,
  );
}
