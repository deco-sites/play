export interface WorkerLocator {
  site: string;
  environment: string;
}
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
  fromHostname(hostname: string): WorkerLocator | null {
    const [siteEnv] = hostname.split(".");
    return Locator.fromStringified(siteEnv);
  },
};
