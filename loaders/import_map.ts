import { AppContext } from "../apps/site.ts";

export interface ImportMapOptions {
  freshVersion?: string;
  decoVersion?: string;
}
export default function importMap(
  { freshVersion, decoVersion }: ImportMapOptions,
  _req: Request,
  { playDomain }: AppContext,
) {
  return Response.json({
    "imports": {
      "play/": `${playDomain}/live/invoke/play/loaders/`,
      "$live/": `https://denopkg.com/deco-cx/deco@${
        decoVersion ?? "deb638083220fffe443df521f84c9af77bd8304f"
      }/`,
      "deco/": `https://denopkg.com/deco-cx/deco@${
        decoVersion ?? "deb638083220fffe443df521f84c9af77bd8304f"
      }/`,
      "$fresh/": `https://denopkg.com/deco-cx/fresh@${
        freshVersion ?? "78b24bb72a837543184d3632b5d77e83db43c0c7"
      }/`,
      "preact": "https://esm.sh/preact@10.15.1",
      "preact/": "https://esm.sh/preact@10.15.1/",
      "preact-render-to-string":
        "https://esm.sh/*preact-render-to-string@6.2.0",
      "@preact/signals": "https://esm.sh/*@preact/signals@1.1.3",
      "@preact/signals-core": "https://esm.sh/@preact/signals-core@1.3.0",
      "std/": "https://deno.land/std@0.190.0/",
      "partytown/": "https://denopkg.com/deco-cx/partytown@0.4.3/",
      "daisyui": "npm:daisyui@3.5.1",
    },
  });
}
