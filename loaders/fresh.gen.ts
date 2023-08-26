import { AppContext, PlayOptions } from "../apps/site.ts";

export default async function freshGenTs(
  { playId }: PlayOptions,
  _req: Request,
  { fs, serveFileUrl }: AppContext,
): Promise<Response> {
  const files = await fs.forPlay(playId).list(["islands"]);
  return new Response(
    `
${
      files.map(({ location }, i) => {
        return `import * as \$${i + 1} from "${
          serveFileUrl(playId, location)
        }";`;
      }).join("\n")
    }

const manifest = {
  routes: {
  },
  islands: {
    ${
      files.map(({ location }, i) => {
        return `"./${location.join("/")}": \$${i + 1},`;
      }).join("\n")
    }
  },
  baseUrl: import.meta.url,
};

export default manifest;
`,
    {
      status: 200,
      headers: { "content-type": "application/typescript" },
    },
  );
}
