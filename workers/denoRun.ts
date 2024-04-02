import EventEmitter from "node:events";
import { delay } from "std/async/delay.ts";
import { Isolate, IsolateOptions } from "./isolate.ts";
import PortPool from "./portpool.ts";
import { isListening, waitForPort } from "./utils.ts";

const buildPermissionsArgs = (
  _perm?: Deno.PermissionOptionsObject,
): string[] => {
  return ["-A"];
};
const portPool = new PortPool();
export class DenoRun implements Isolate {
  private disposing = false;
  private ctrl = new AbortController();
  protected child: Deno.ChildProcess;
  protected cleanUpPromises: Promise<void>;
  protected inflightRequests = 0;
  protected inflightZeroEmitter = new EventEmitter();
  protected port: number;
  constructor(protected options: IsolateOptions) {
    this.port = portPool.get();
    const [child, cleanUpPromises] = this.spawn();
    this.child = child;
    this.cleanUpPromises = cleanUpPromises;
  }
  fetch(req: Request): Promise<Response> {
    this.inflightRequests++;
    const url = new URL(req.url);
    url.port = `${this.port}`;
    const nReq = new Request(url.toString(), req);
    return fetch(nReq).finally(() => {
      this.inflightRequests--;
      if (this.inflightRequests === 0) {
        this.inflightZeroEmitter.emit("zero");
      }
    });
  }
  async [Symbol.asyncDispose](): Promise<void> {
    if (this.disposing) {
      return;
    }
    this.disposing = true;
    if (!this.ctrl.signal.aborted) {
      this.ctrl.abort();
    }
    await this.cleanUpPromises;
    const inflightZero = Promise.withResolvers<void>();
    if (this.inflightRequests > 0) {
      this.inflightZeroEmitter.on("zero", () => {
        inflightZero.resolve();
      });
    } else {
      inflightZero.resolve();
    }
    await Promise.race([inflightZero.promise, delay(10_000)]); // timeout of 10s
    this.child.kill("SIGKILL");
    portPool.free(this.port);
    return Promise.resolve();
  }
  isRunning(): Promise<boolean> {
    return isListening(this.port);
  }
  async waitUntilReady(timeoutMs?: number): Promise<void> {
    await waitForPort(this.port, {
      timeout: timeoutMs ?? 30_000,
      listening: true,
    });
  }
  private spawn(): [Deno.ChildProcess, Promise<void>] {
    const command = new Deno.Command(Deno.execPath(), {
      args: [
        "run",
        "--node-modules-dir=false",
        ...buildPermissionsArgs(this.options.permissions),
        "main.ts",
      ],
      cwd: this.options.cwd,
      stdout: "inherit",
      stderr: "inherit",
      env: { ...this.options.envVars, PORT: `${this.port}` },
    });
    const child = command.spawn();
    return [child, Promise.resolve()];
  }
}
