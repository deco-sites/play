import {
  FileSystem,
  PlayFS,
} from "https://denopkg.com/mcandeia/play@0.1.2/app/mod.ts";

export default function kvfs(_props: unknown): PlayFS {
  return {
    forPlay: () => {
      return {} as FileSystem;
    },
  };
}
