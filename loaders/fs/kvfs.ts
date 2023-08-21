/// <reference lib="deno.unstable" />

import {
  File,
  PlayFS,
} from "https://denopkg.com/mcandeia/play@0.1.9/app/mod.ts";

let kv: Deno.Kv | null = null;
try {
  kv = await Deno?.openKv().catch((_err) => null);
} catch {
  console.warn("please run with `--unstable` to enable deno kv support");
}
/**
 * @title Deno KV
 */
export default function kvfs(_props: unknown): PlayFS {
  return {
    forPlay: (playId: string) => {
      return {
        get: (location: string[]) => {
          return kv?.get<File>?.([playId, ...location])?.then?.((result) =>
            result.value
          ) ?? Promise.resolve(null);
        },
        createOrEdit: async (location: string[], content: string) => {
          await kv?.set?.([playId, ...location], { content, location });
          return { content, location };
        },
        rm: async (location: string[]) => {
          await kv?.delete?.([playId, ...location]);
        },
        list: async (location?: string[]) => {
          const filesIterator = kv?.list<File>({
            prefix: [playId, ...location ?? []],
          });
          const files: File[] = [];
          for await (const file of (filesIterator ?? [])) {
            files.push(file.value);
          }
          return files ?? [];
        },
      };
    },
  };
}
