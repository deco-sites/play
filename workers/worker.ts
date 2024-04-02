import { defaultFs, mount, MountPoint } from "deco/scripts/mount.ts";
import { DenoRun } from "./denoRun.ts";
import { Isolate } from "./isolate.ts";
import { debounce } from "std/async/mod.ts";

export const SERVER_SOCK = "server.sock";
export interface WorkerOptions {
  envVars: { [key: string]: string };
  cwd: string;
  memoryLimit: string;
  cpuLimit: number;
  entrypoint?: string;
  id: string;
}

export class UserWorker {
  protected isolate: Promise<Isolate>;
  protected mountPoint: MountPoint;
  protected portsTaken = new Map<number, boolean>();

  constructor(protected options: WorkerOptions) {
    const fs = defaultFs(this.options.cwd);
    this.mountPoint = mount({
      fs,
      vol:
        `https://admin.deco.cx/live/invoke/deco-sites/admin/loaders/environments/watch.ts?site=${this.options.id}&name=Staging&head=root`,
    });
    const { promise, resolve, reject } = Promise.withResolvers<void>();
    const timeout = setTimeout(() => {
      reject(new Error(`time out waiting for ${this.options.id}`));
    }, 15_000);
    this.mountPoint.onReady = () => {
      clearTimeout(timeout);
      resolve();
      const watcher = fs.watchFs(this.options.cwd, { recursive: true });
      this.mountPoint.onUnmount = () => {
        watcher.close();
      };
      (async () => {
        let queue = Promise.resolve();

        const restartIsolate = debounce(() => {
          if (typeof this.isolate === "undefined") {
            return;
          }
          queue = queue.catch(() => {}).then(() => {
            return this.isolate.then(async (isolate) => {
              await this.gracefulShutdown(isolate);
              this.isolate = this.start();
              return this.isolate.then(() => {});
            });
          });
        }, 200);
        for await (const event of watcher) {
          if (
            event.paths.some((path) =>
              path.endsWith(".ts") || path.endsWith(".tsx")
            )
          ) {
            restartIsolate();
          }
        }
      })();
    };

    this.isolate = promise.then(() => {
      return this.start();
    });
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
          FRESH_ESBUILD_LOADER: "portable",
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

  async fetch(req: Request): Promise<Response> {
    const isolate = await this.isolate;
    return isolate.fetch(req);
  }
}
