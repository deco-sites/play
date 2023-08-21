import type { AppContext, File, PlayOptions } from "../../apps/site.ts";

export interface Props extends PlayOptions {
  file: File;
}
export default async function createOrEdit(
  { file, playId }: Props,
  _req: Request,
  { fs }: AppContext,
): Promise<File> {
  return await fs.forPlay(playId).createOrEdit(file.location, file.content);
}
