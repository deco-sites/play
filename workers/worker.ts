import { defaultFs, mount, MountPoint } from "deco/scripts/mount.ts";
import { EventEmitter } from "node:events";
import { delay } from "std/async/mod.ts";
import { Command } from "./commands/command.ts";
import { WorkerState } from "./runner.ts";
import { waitForPort } from "./utils.ts";

export const SERVER_SOCK = "server.sock";
export interface WorkerOptions {
  envVars: { [key: string]: string };
  cwd: string;
  memoryLimit: string;
  cpuLimit: number;
  entrypoint?: string;
  port: number;
  id: string;
}

export interface WorkerMount {
  worker: Worker;
  mountPoint: MountPoint;
}
export class UserWorker {
  protected inflightRequests = 0;
  protected inflightZeroEmitter = new EventEmitter();
  protected worker: Promise<Worker>;
  protected mountPoint: MountPoint;
  protected inflightCommands = new Map<
    string,
    ReturnType<typeof Promise.withResolvers<WorkerState>>
  >();
  protected lastSeenState: WorkerState | undefined;

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
        for await (const event of watcher) {
          if (
            event.paths.some((path) =>
              path.endsWith(".ts") || path.endsWith(".tsx")
            )
          ) {
            await this.worker;
            await this.restart();
          }
        }
      })();
    };

    this.worker = promise.then(() => {
      return this.restart(true);
    });
  }

  async sendCommand(
    cmd: Command,
    _worker?: Worker | undefined,
  ): Promise<WorkerState> {
    const id: string = crypto.randomUUID();
    const resolvers = Promise.withResolvers<WorkerState>();
    this.inflightCommands.set(id, resolvers);
    const worker = _worker ?? await this.worker;
    worker.postMessage({ id, command: cmd });
    return resolvers.promise;
  }

  async gracefulShutdown(worker?: Worker): Promise<void> {
    const { promise, resolve, reject } = Promise.withResolvers<void>();
    if (worker) {
      console.log("stopping");
      await this.sendCommand({ name: "stop" }, worker).catch(reject);
      console.log("stopped");
      const inflightZero = Promise.withResolvers<void>();
      if (this.inflightRequests > 0) {
        console.log("inflight");
        this.inflightZeroEmitter.on("zero", () => {
          inflightZero.resolve();
        });
      } else {
        inflightZero.resolve();
      }
      await Promise.race([inflightZero.promise, delay(2_000)]); // timeout of 2s
      console.log("resolved");
      for (const inflightPromise of this.inflightCommands.values()) {
        inflightPromise.reject(new Error("Worker is restarting"));
      }
      this.inflightCommands.clear();
      console.log("terminating");
      worker.terminate();
      console.log("terminated");
      await waitForPort(this.options.port, {
        timeout: 30_000,
        listening: false,
      });
      console.log("port available");
      resolve();
    } else {
      resolve();
    }

    return promise;
  }
  async restart(firstLoad = false): Promise<Worker> {
    const current = !firstLoad && typeof this.worker !== "undefined"
      ? await this.worker
      : undefined;
    this.worker = new Promise<Worker>((resolve, reject) => {
      this.gracefulShutdown(current).then(() => {
        const worker = new Worker(
          new URL("./runner.ts", import.meta.url).href,
          {
            type: "module",
            deno: {
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
          },
        );

        worker.onmessage = (evt) => {
          if (!evt.data.id) {
            return;
          }

          const inflight = this.inflightCommands.get(evt.data.id);
          if (!inflight) {
            return;
          }

          inflight.resolve(evt.data.state);
          this.lastSeenState = evt.data.state;
          this.inflightCommands.delete(evt.data.id);
        };

        worker.onerror = (err) => {
          err.stopPropagation();
          err.preventDefault();
          err.stopImmediatePropagation();
          console.log("on error");
          console.log(err);
          return null;
        };

        worker.onmessageerror = (err) => {
          console.log("message error", err);
          reject(err);
        };

        this.sendCommand({
          id: this.options.id,
          name: "run",
          cwd: this.options.cwd,
          port: this.options.port,
          envVars: {
            ...this.options.envVars,
            PORT: `${this.options.port}`,
            FRESH_ESBUILD_LOADER: "portable",
          },
        }, worker)
          .then(async (state) => {
            if (state.err) {
              reject(new Error(state.err));
              return;
            }
            await waitForPort(this.options.port, {
              timeout: 120000,
              listening: true,
            });
            resolve(worker);
          })
          .catch((err) => {
            reject(err);
          });
      }).catch(reject);
    });
    return this.worker;
  }

  async fetch(req: Request): Promise<Response> {
    await this.worker;
    const url = new URL(req.url);
    url.port = `${this.options.port}`;
    this.inflightRequests++;
    const nReq = new Request(url.toString(), req);
    return fetch(nReq).finally(() => {
      this.inflightRequests--;
      if (this.inflightRequests === 0) {
        this.inflightZeroEmitter.emit("zero");
      }
    });
  }
}
