import EventEmitter from "node:events";
import { delay } from "std/async/delay.ts";
import { Isolate, IsolateOptions } from "./isolate.ts";
import PortPool from "./portpool.ts";
import { waitForPort } from "./utils.ts";

const permCache: Record<string, Deno.PermissionState> = {};
const buildPermissionsArgs = (
  perm?: Deno.PermissionOptionsObject,
): string[] => {
  if (!perm) {
    return ["-A"];
  }
  const args: string[] = [];
  for (const [key, value] of Object.entries(perm)) {
    if (value === "inherit") {
      permCache[key] ??= Deno.permissions.querySync({
        name: key as keyof Deno.PermissionOptionsObject,
      }).state;
      const access = permCache[key];
      access === "granted" && args.push(`--allow-${key}`);
    } else if (value === true) {
      args.push(`--allow-${key}`);
    } else if (Array.isArray(value) || typeof value === "string") {
      const values = Array.isArray(value) ? value : [value];
      args.push(`--allow-${key}=${values.join(",")}`);
    }
  }

  return args;
};
const portPool = new PortPool();
export class DenoRun implements Isolate {
  private ctrl: AbortController | undefined;
  protected child: Deno.ChildProcess | undefined;
  protected cleanUpPromises: Promise<void> | undefined;
  protected inflightRequests = 0;
  protected inflightZeroEmitter = new EventEmitter();
  protected port: number;
  protected disposed:
    | ReturnType<typeof Promise.withResolvers<void>>
    | undefined;
  constructor(protected options: IsolateOptions) {
    this.port = portPool.get();
  }
  start(): void {
    if (this.isRunning()) {
      return;
    }
    this.ctrl = new AbortController();
    this.disposed = Promise.withResolvers<void>();
    this.ctrl.signal.onabort = this.dispose.bind(this);
    const [child, cleanUpPromises] = this.spawn();
    this.child = child;
    this.cleanUpPromises = cleanUpPromises;
  }
  async dispose() {
    this.cleanUpPromises && await this.cleanUpPromises;
    const inflightZero = Promise.withResolvers<void>();
    if (this.inflightRequests > 0) {
      this.inflightZeroEmitter.on("zero", () => {
        inflightZero.resolve();
      });
    } else {
      inflightZero.resolve();
    }
    await Promise.race([inflightZero.promise, delay(10_000)]); // timeout of 10s
    this.child?.kill("SIGKILL");
    portPool.free(this.port);
    this.disposed?.resolve();
  }
  fetch(req: Request): Promise<Response> {
    this.inflightRequests++;
    const url = new URL(req.url);
    url.port = `${this.port}`;
    url.hostname = "0.0.0.0";

    const nReq = new Request(url.toString(), req);
    return fetch(nReq).finally(() => {
      this.inflightRequests--;
      if (this.inflightRequests === 0) {
        this.inflightZeroEmitter.emit("zero");
      }
    });
  }
  async [Symbol.asyncDispose](): Promise<void> {
    try {
      !this.ctrl?.signal.aborted && this.ctrl?.abort();
    } finally {
      await this.child?.status;
      await Promise.race([this.disposed?.promise, delay(10_000)]); // timeout of 10s
    }
  }
  isRunning(): boolean {
    return this.ctrl?.signal.aborted === false;
  }
  async waitUntilReady(timeoutMs?: number): Promise<void> {
    await waitForPort(this.port, {
      timeout: timeoutMs ?? 30_000,
      listening: true,
      signal: this.ctrl?.signal,
    });
  }
  private spawn(): [Deno.ChildProcess, Promise<void>] {
    const command = new Deno.Command(Deno.execPath(), {
      args: [
        "run",
        "--no-prompt",
        "--node-modules-dir=false",
        "--unstable-hmr", // remove this and let restart isolate work.
        ...buildPermissionsArgs(this.options.permissions),
        "main.ts",
      ],
      cwd: this.options.cwd,
      stdout: "inherit",
      stderr: "inherit",
      env: { ...this.options.envVars, PORT: `${this.port}` },
    });
    const child = command.spawn();
    child.status.then((status) => {
      if (status.code !== 0) {
        console.error("child process failed", status);
        this.ctrl?.abort();
      }
    });
    return [child, Promise.resolve()];
  }
}
