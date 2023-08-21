import { blocks } from "deco/mod.ts";
import { AppContext, PlayOptions } from "../apps/site.ts";

export default async function manifestGenTs(
  { playId }: PlayOptions,
  _req: Request,
  { fs, serveFileUrl }: AppContext,
): Promise<Response> {
  const playfs = fs.forPlay(playId);
  const blks = await Promise.all(blocks.default.map((blk) => {
    return playfs.list([blk.type]).then((files) => {
      return { files, type: blk.type };
    });
  }));
  return new Response(
    `
${
      blks.map((blk, i) => {
        return blk.files.map((file, fileIdx) => {
          return `import * as ${"\$".repeat(fileIdx + 1)}${i + 1} from "${
            serveFileUrl(playId, file.location)
          }";`;
        }).join("\n");
      }).join("\n")
    }

const manifest = {
    ${
      blks.map((blk, i) => {
        const keys = blk.files.map((file, fileIdx) => {
          return `"${playId}/${file.location.join("/")}":${
            "\$".repeat(fileIdx + 1)
          }${i + 1},`;
        }).join("\n");
        return `${blk.type}: {
            ${keys}
        },`;
      }).join("\n")
    }
  name: "${playId}",
  baseUrl: import.meta.url,
};

export type Manifest = typeof manifest;

export default manifest;
`,
    {
      status: 200,
      headers: { "content-type": "application/typescript" },
    },
  );
}
