import { join } from "std/path/mod.ts";
import { Env, Realtime } from "./deps.ts";
import { Locator } from "./locator.ts";
import { HypervisorRealtimeState } from "./realtime/object.ts";
import { UserWorker } from "./workers/worker.ts";

const USER_WORKERS_FOLDER = Deno.env.get("USER_WORKERS_FOLDER") ?? ".workers";
const NO_ACTIVITY_TIMEOUT = 30_000;
export class Hypervisor {
  private workers = new Map<string, UserWorker>();
  private realtimeFs = new Map<string, Realtime>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  constructor() {
  }

  public fetch(req: Request): Promise<Response> {
    console.log(req.headers);
    console.log(req.headers.get("host"), req.headers.get("x-forwarded-for"));
    // do some domain-based routing
    const url = new URL(req.url);
    const locator = Locator.fromHostname(url.hostname);
    if (!locator) {
      return Promise.resolve(new Response(null, { status: 404 }));
    }

    const cwd = join(
      Deno.cwd(),
      USER_WORKERS_FOLDER,
      Locator.stringify(locator),
      "/",
    );
    if (url.pathname.startsWith("/volumes")) {
      let realtime = this.realtimeFs.get(cwd);
      if (!realtime) {
        const state = new HypervisorRealtimeState({ dir: cwd });
        realtime = new Realtime(state, {} as Env);
        this.realtimeFs.set(cwd, realtime);
      }
      return realtime.fetch(req);
    }
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
      console.error("error", err);
      return new Response(null, { status: 500 });
    });
  }
}
