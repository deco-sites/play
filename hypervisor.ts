import { randomSiteName } from "deco/engine/manifest/utils.ts";
import { join } from "std/path/mod.ts";
import { UserWorker } from "./workers/worker.ts";

const USER_WORKERS_FOLDER = Deno.env.get("USER_WORKERS_FOLDER") ?? ".workers";
const workerIdParam = "__workerId";
export class Hypervisor {
  private workers = new Map<string, UserWorker>();
  private localhostSite: string | undefined = undefined;
  private currentPort: number = 10303;
  constructor() {
  }

  workerId(req: Request): string {
    const url = new URL(req.url);
    const refUrl = req.headers.get("referer");
    const refererParsedUrl = refUrl ? new URL(refUrl) : undefined;
    const idFromQs = refererParsedUrl?.searchParams.get(workerIdParam) ??
      url.searchParams.get(workerIdParam);
    if (idFromQs) {
      return idFromQs;
    }
    const hostname = url.hostname;
    let environmentName: string;
    if (hostname === "localhost") {
      environmentName = this.localhostSite ??= randomSiteName();
    } else {
      environmentName = hostname.split(".")?.[0] ?? randomSiteName();
    }
    return environmentName;
  }

  public fetch(req: Request): Promise<Response> {
    const workerId = this.workerId(req);
    let worker = this.workers.get(workerId);
    if (!worker) {
      const port = this.currentPort++;
      worker = new UserWorker({
        id: workerId,
        cpuLimit: 1,
        port,
        memoryLimit: "512Mi",
        cwd: join(Deno.cwd(), USER_WORKERS_FOLDER, workerId, "/"),
        envVars: {
          DECO_SITE_NAME: workerId,
        },
      });
      this.workers.set(workerId, worker);
    }
    return worker.fetch(req) as unknown as Promise<Response>;
  }
}
