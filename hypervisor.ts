import { join } from "std/path/mod.ts";
import { Env, Realtime } from "./deps.ts";
import { Locator, WorkerLocator } from "./locator.ts";
import {
  HypervisorDiskStorage,
  HypervisorMemStorage,
  HypervisorRealtimeState,
} from "./realtime/object.ts";
import { UserWorker } from "./workers/worker.ts";

const HYPERVISOR_API_SPECIFIER = "x-hypervisor-api";
const USER_WORKERS_FOLDER = Deno.env.get("USER_WORKERS_FOLDER") ?? ".workers";
const NO_ACTIVITY_TIMEOUT = 30_000;
const BASE_FOLDER = join(
  Deno.cwd(),
  USER_WORKERS_FOLDER,
);

const defaultSiteName = Deno.env.get("DECO_SITE_NAME");
const defaultEnv = Deno.env.get("DECO_ENVIRONMENT_NAME");
const DEFAULT_LOCATOR: WorkerLocator | undefined = defaultSiteName
  ? {
    site: defaultSiteName,
    environment: defaultEnv ?? "staging",
  }
  : undefined;
export class Hypervisor {
  private workers = new Map<string, UserWorker>();
  private realtimeFs = new Map<
    string,
    { realtime: Realtime; state: HypervisorRealtimeState }
  >();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  constructor() {
  }

  public fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const isHypervisorApi = (req.headers.get(HYPERVISOR_API_SPECIFIER) ??
      url.searchParams.get(HYPERVISOR_API_SPECIFIER)) === "true";
    if (isHypervisorApi && url.pathname.startsWith("/volumes")) {
      const [_, __, volumeHash] = url.pathname.split("/");
      const [ephemeralSEP, ...rest] = volumeHash.split(":");
      const [ephemeral, volume] = ephemeralSEP === "ephemeral"
        ? [true, rest.join(":")]
        : [false, volumeHash];
      const volumeId = `${volume}@${ephemeral}`;
      let worker = this.realtimeFs.get(volumeId);
      if (!worker) {
        const storage = ephemeral
          ? new HypervisorMemStorage()
          : new HypervisorDiskStorage(join(
            BASE_FOLDER,
            volume,
            "/",
          ));
        const state = new HypervisorRealtimeState({
          storage,
        });
        worker = { realtime: new Realtime(state, {} as Env), state };
        this.realtimeFs.set(volumeId, worker);
      }
      return worker.state.wait().then(() => worker.realtime.fetch(req)).catch(
        (err) => {
          console.error("error", url.pathname, err);
          return new Response(null, { status: 500 });
        },
      );
    }

    const locator = Locator.fromHostname(url.hostname) ?? DEFAULT_LOCATOR;
    if (!locator) {
      return Promise.resolve(new Response(null, { status: 404 }));
    }
    const cwd = join(
      BASE_FOLDER,
      Locator.stringify(locator),
      "/",
    );

    let worker = this.workers.get(cwd);
    if (!worker) {
      worker = new UserWorker({
        locator,
        cpuLimit: 1,
        memoryLimit: "512Mi",
        cwd,
        envVars: {},
      });
      this.workers.set(cwd, worker);
    }
    this.timers.has(cwd) &&
      clearTimeout(this.timers.get(cwd)!);
    this.timers.set(
      cwd,
      setTimeout(async () => {
        console.log("stopping worker", cwd);
        this.workers.delete(cwd);
        this.timers.delete(cwd);
        await worker.stop();
      }, NO_ACTIVITY_TIMEOUT),
    );
    return worker.fetch(new Request(url, req)).catch((err) => {
      console.error("error", url.pathname, err);
      return new Response(null, { status: 500 });
    });
  }
}
