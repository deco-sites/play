import { WorkerLocator } from "../locator.ts";
import { DenoRun } from "./denoRun.ts";
import { Isolate } from "./isolate.ts";

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
  protected isolate: Promise<Isolate>;

  constructor(protected options: WorkerOptions) {
    this.isolate = this.start();
  }

  async gracefulShutdown(worker?: Isolate): Promise<void> {
    await worker?.[Symbol.asyncDispose]();
  }
  async start(): Promise<Isolate> {
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
          run: false,
          write: false,
          sys: "inherit",
        },
      },
    );

    await isolate.waitUntilReady();
    return isolate;
  }
  async stop(): Promise<void> {
    await this.gracefulShutdown(await this.isolate);
  }

  fetch(req: Request): Promise<Response> {
    return this.isolate.then((isolate) => isolate.fetch(req)).catch((err) => {
      console.error("isolate not available", err);
      return new Response(null, { status: 500 });
    });
  }
}
