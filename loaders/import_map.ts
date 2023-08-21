export interface ImportMapOptions {
  freshVersion?: string;
  decoVersion?: string;
}
export default function importMap(
  { freshVersion, decoVersion }: ImportMapOptions,
  _req: Request,
) {
  return Response.json({
    "imports": {
      "deco/": `https://denopkg.com/deco-cx/deco@${decoVersion ?? "1.29.1"}/`,
      "$fresh/": `https://denopkg.com/deco-cx/fresh@${
        freshVersion ?? "5d7384631e8b8366c0d6cb15e158f43e0d01a218"
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
