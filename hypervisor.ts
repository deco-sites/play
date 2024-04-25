import * as colors from "std/fmt/colors.ts";
import { Env, Realtime } from "./deps.ts";
import {
  HypervisorDiskStorage,
  HypervisorRealtimeState,
} from "./realtime/object.ts";
import { DenoRun } from "./workers/denoRun.ts";
import { Isolate } from "./workers/isolate.ts";

const HYPERVISOR_API_SPECIFIER = "x-hypervisor-api";

export class Hypervisor {
  private realtimeFsState: HypervisorRealtimeState;
  private realtimeFs: Realtime;
  private isolate: Isolate;
  constructor(protected cmd: Deno.Command, protected port: number) {
    const storage = new HypervisorDiskStorage(Deno.cwd());
    // TODO (@mcandeia) Deal with ephemeral volumes like presence
    this.realtimeFsState = new HypervisorRealtimeState({
      storage,
    });
    this.realtimeFs = new Realtime(this.realtimeFsState, {} as Env);
    this.isolate = new DenoRun({
      command: cmd,
      port,
    });
  }

  errAs500(err: unknown) {
    console.error(
      colors.brightYellow(`isolate not available`),
      err,
    );
    return new Response(null, { status: 500 });
  }

  public async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const isHypervisorApi = (req.headers.get(HYPERVISOR_API_SPECIFIER) ??
      url.searchParams.get(HYPERVISOR_API_SPECIFIER)) === "true";
    if (isHypervisorApi && url.pathname.startsWith("/volumes")) {
      return this.realtimeFsState.wait().then(() => this.realtimeFs.fetch(req))
        .catch(
          (err) => {
            console.error("error when fetching realtimeFs", url.pathname, err);
            return new Response(null, { status: 500 });
          },
        );
    }

    if (!this.isolate.isRunning()) {
      this.isolate.start();
      await this.isolate.waitUntilReady();
    }
    return this.isolate.fetch(req).catch(async (err) => {
      if (this.isolate.isRunning()) {
        await this.isolate.waitUntilReady().catch((_err) => {});
        return this.isolate.fetch(req).catch(this.errAs500);
      }
      return this.errAs500(err);
    });
  }
  public async shutdown() {
    await this.isolate?.[Symbol.asyncDispose]();
  }
}
