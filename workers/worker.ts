import { defaultFs, mount, MountPoint } from "deco/scripts/mount.ts";
import { debounce } from "std/async/mod.ts";
import denoJSON from "../deno.json" with { type: "json" };
import { DenoRun } from "./denoRun.ts";
import { Isolate } from "./isolate.ts";

export const SERVER_SOCK = "server.sock";
export interface WorkerOptions {
  envVars: { [key: string]: string };
  cwd: string;
  memoryLimit: string;
  cpuLimit: number;
  entrypoint?: string;
  id: string;
}

const DENOJSON_FILE = "deno.json";

const DENO_DIR_ENV_VAR = "DENO_DIR";
const denoDir = Deno.env.get(DENO_DIR_ENV_VAR);
const MY_IMPORTS = denoJSON.imports;

export class UserWorker {
  protected isolate: Promise<Isolate>;
  protected mountPoint: MountPoint;
  protected site: string;

  constructor(protected options: WorkerOptions) {
    const volUrl = new URL(options.id);
    this.site = volUrl.searchParams.get("site")!;
    const defaultFileSystem = defaultFs(this.options.cwd);
    const fs: typeof defaultFileSystem = {
      ...defaultFileSystem,
      writeTextFile: (path, content) => {
        if (
          path.toString().endsWith(DENOJSON_FILE) && typeof content === "string"
        ) {
          try {
            const parsed: typeof denoJSON = JSON.parse(content);
            return defaultFileSystem.writeTextFile(
              path,
              JSON.stringify({
                ...parsed,
                imports: { ...parsed?.imports ?? {}, ...MY_IMPORTS },
                nodeModulesDir: false,
              }),
            );
          } catch {
            return defaultFileSystem.writeTextFile(path, content);
          }
        }
        return defaultFileSystem.writeTextFile(path, content);
      },
    };
    this.mountPoint = mount({
      fs,
      vol: volUrl.toString(),
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
              await this.isolate;
              return Promise.resolve();
            });
          });
        }, 200);
        for await (const event of watcher) {
          if (
            event.paths.some((path) =>
              path.endsWith(".ts") || path.endsWith(".tsx")
            )
          ) {
            //restartIsolate(); TODO(mcandeia) this should be removed if hmr is disabled.
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
          ...denoDir ? { [DENO_DIR_ENV_VAR]: denoDir } : {},
          FRESH_ESBUILD_LOADER: "portable",
          DECO_SITE_NAME: this.site,
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
