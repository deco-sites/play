import { mount, MountPoint } from "deco/scripts/mount.ts";
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
  protected worker: Promise<WorkerMount>;
  protected inflightCommands = new Map<
    string,
    ReturnType<typeof Promise.withResolvers<WorkerState>>
  >();
  protected lastSeenState: WorkerState | undefined;

  constructor(protected options: WorkerOptions) {
    this.worker = this.restart();
  }

  getWorker() {
    return this.worker.then((m) => m.worker);
  }
  async sendCommand(
    cmd: Command,
    _worker?: Worker | undefined,
  ): Promise<WorkerState> {
    const id: string = crypto.randomUUID();
    const resolvers = Promise.withResolvers<WorkerState>();
    this.inflightCommands.set(id, resolvers);
    const worker = _worker ?? await this.getWorker();
    worker.postMessage({ id, command: cmd });
    return resolvers.promise;
  }

  async gracefulShutdown(wkMount?: WorkerMount): Promise<void> {
    const { promise, resolve, reject } = Promise.withResolvers<void>();
    if (wkMount) {
      await this.sendCommand({ name: "stop" }, wkMount.worker).catch(reject);
      const inflightZero = Promise.withResolvers<void>();
      if (this.inflightRequests > 0) {
        this.inflightZeroEmitter.on("zero", () => {
          inflightZero.resolve();
        });
      } else {
        inflightZero.resolve();
      }
      await Promise.race([inflightZero.promise, delay(2_000)]); // timeout of 2s
      for (const inflightPromise of this.inflightCommands.values()) {
        inflightPromise.reject(new Error("Worker is restarting"));
      }
      wkMount.worker.terminate();
      wkMount.mountPoint.unmount();
      await waitForPort(this.options.port, {
        timeout: 30_000,
        listening: false,
      });
      resolve();
    } else {
      resolve();
    }

    return promise;
  }
  async restart(): Promise<WorkerMount> {
    const current = typeof this.worker !== "undefined"
      ? await this.worker
      : undefined;
    this.worker = new Promise<WorkerMount>((resolve, reject) => {
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
          console.log("on error");
          console.log(err.message);
          reject(err);
        };

        worker.onmessageerror = (err) => {
          reject(err);
        };

        this.mountAndRun(worker).then(resolve).catch(reject);
      }).catch(reject);
    });
    return this.worker;
  }

  private mountAndRun(
    worker: Worker,
  ): Promise<WorkerMount> {
    const { promise, resolve, reject } = Promise.withResolvers<WorkerMount>();
    const mountPoint = mount({
      vol:
        `https://admin.deco.cx/live/invoke/deco-sites/admin/loaders/environments/watch.ts?site=${this.options.id}&name=Staging&head=root`,
    });
    mountPoint.onReady = () => {
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
          resolve({ worker, mountPoint });
        })
        .catch((err) => {
          reject(err);
        });
    };
    return promise;
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
