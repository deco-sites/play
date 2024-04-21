import { allowCorsFor } from "deco/mod.ts";
import { exists } from "std/fs/exists.ts";
import { join } from "std/path/mod.ts";
import { WorkerLocator } from "../locator.ts";
import { DenoRun } from "./denoRun.ts";
import { Isolate } from "./isolate.ts";
import meta from "./meta.json" with { type: "json" };
export const SERVER_SOCK = "server.sock";
export interface WorkerOptions {
  envVars: { [key: string]: string };
  cwd: string;
  memoryLimit: string;
  cpuLimit: number;
  entrypoint?: string;
  locator: WorkerLocator;
}

const DENO_DIR_ENV_VAR = "DENO_DIR";
const denoDir = Deno.env.get(DENO_DIR_ENV_VAR);

export class UserWorker {
  protected isolate: Isolate;

  constructor(protected options: WorkerOptions) {
    this.isolate = this.start();
  }

  async gracefulShutdown(isolate?: Isolate): Promise<void> {
    await isolate?.[Symbol.asyncDispose]();
  }
  start(): Isolate {
    const isolate = new DenoRun(
      {
        cwd: this.options.cwd,
        envVars: {
          ...this.options.envVars,
          ...denoDir ? { [DENO_DIR_ENV_VAR]: denoDir } : {},
          FRESH_ESBUILD_LOADER: "portable",
          DECO_SITE_NAME: this.options.locator.site,
        },
        permissions: {
          env: "inherit",
          net: "inherit",
          ffi: "inherit",
          hrtime: "inherit",
          read: "inherit",
          run: true,
          write: [join(this.options.cwd, "fresh.gen.ts")],
          sys: "inherit",
        },
      },
    );

    return isolate;
  }
  async stop(): Promise<void> {
    await this.gracefulShutdown(await this.isolate);
  }

  errAs500(err: unknown) {
    console.error("isolate not available", err);
    return new Response(null, { status: 500 });
  }

  async fetch(req: Request): Promise<Response> {
    if (!this.isolate.isRunning() && !await exists(this.options.cwd)) {
      if (req.url.includes("/live/_meta")) {
        return new Response(
          JSON.stringify({ ...meta, site: this.options.locator.site }),
          { status: 200, headers: allowCorsFor(req) },
        );
      }
    }
    if (!this.isolate.isRunning()) {
      this.isolate.start();
      await this.isolate.waitUntilReady();
    }
    return this.isolate.fetch(req).catch(async (err) => {
      if (this.isolate.isRunning()) {
        await this.isolate.waitUntilReady();
        return this.isolate.fetch(req).catch(this.errAs500);
      }
      return this.errAs500(err);
    });
  }
}
