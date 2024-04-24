import { getCookies } from "std/http/mod.ts";

export interface WorkerLocator {
  site: string;
  environment: string;
}
export const COOKIE_QS_DECO_ENV_NAME = "deco_env";
export const Locator = {
  stringify: (locator: WorkerLocator) =>
    `${locator.environment}--${locator.site}`,
  fromStringified: (siteEnv: string): WorkerLocator | null => {
    const [environment, site] = siteEnv.split("--");
    if (!site || !environment) {
      return null;
    }
    return {
      site,
      environment,
    };
  },
  fromReq: (req: Request): WorkerLocator | null => {
    const cookies = getCookies(req.headers);
    const cookie = cookies[COOKIE_QS_DECO_ENV_NAME];
    return cookie
      ? Locator.fromStringified(cookie)
      : Locator.fromUrl(new URL(req.url));
  },
  fromUrl: (url: URL): WorkerLocator | null => {
    const decoEnv = url.searchParams.get(COOKIE_QS_DECO_ENV_NAME);
    return decoEnv
      ? Locator.fromStringified(decoEnv)
      : Locator.fromHostname(url.hostname);
  },
  fromHostname(hostname: string): WorkerLocator | null {
    const [siteEnv] = hostname.split(".");
    return Locator.fromStringified(siteEnv);
  },
};
