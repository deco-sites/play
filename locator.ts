export interface WorkerLocator {
  site: string;
  environment: string;
}
export const Locator = {
  stringify: (locator: WorkerLocator) =>
    `${locator.environment}--${locator.site}`,
  fromHostname(hostname: string): WorkerLocator | null {
    const [siteEnv] = hostname.split(".");
    const [environment, site] = siteEnv.split("--");
    if (!site || !environment) {
      return null;
    }
    return {
      site,
      environment,
    };
  },
};
