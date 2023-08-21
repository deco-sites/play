import { extname } from "std/path/mod.ts";
import { AppContext, PlayOptions } from "../../apps/site.ts";

export interface Props extends PlayOptions {
  location: string[];
}
const extensionToContentType: Record<string, string> = {
  "ts": "application/typescript",
  "tsx": "application/typescript",
  "js": "application/javascript",
  "jsx": "application/javascript",
  "json": "application/json",
  "jsonc": "application/jsonc",
};
export default async function serveFile(
  { location, playId }: Props,
  _req: Request,
  { fs }: AppContext,
): Promise<Response> {
  const file = await fs.forPlay(playId).get(location);
  if (!file) {
    return new Response(null, { status: 404 });
  }
  const fileExtension = extname(file.location[file.location.length - 1]);
  return new Response(file.content, {
    status: 200,
    headers: {
      "content-type": extensionToContentType[fileExtension] ??
        "application/typescript",
    },
  });
}
