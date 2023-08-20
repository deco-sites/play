import { FileSystem, PlayFS } from "../../../deco-play/app/mod.ts";

export default function kvfs(_props: unknown): PlayFS {
  return {
    forPlay: () => {
      return {} as FileSystem;
    },
  };
}
