import { forApp } from "deco/clients/withManifest.ts";
import { default as app } from "./apps/site.ts";

export const Runtime = forApp<ReturnType<typeof app>>();
