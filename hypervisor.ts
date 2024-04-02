import { getCookies, setCookie } from "std/http/cookie.ts";
import { join } from "std/path/mod.ts";
import { UserWorker } from "./workers/worker.ts";

const USER_WORKERS_FOLDER = Deno.env.get("USER_WORKERS_FOLDER") ?? ".workers";
const workerIdParam = "__vol";
const DECO_VOLUME_COOKIE_NAME = "deco_vol";
const COOKIE_MARKER = "@";
export class Hypervisor {
  private workers = new Map<string, UserWorker>();
  constructor() {
  }

  public fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);

    // Get the inline release from the query string
    const volumeFromQs = url.searchParams.get(workerIdParam);
    url.searchParams.delete(workerIdParam);
    const ref = req.headers.get("referer");

    const referer = ref && URL.canParse(ref) ? new URL(ref) : null;
    const volumeFromRef = referer?.searchParams.get(workerIdParam);
    const requesterVolume = volumeFromQs ?? volumeFromRef;

    const cookable = requesterVolume?.startsWith(COOKIE_MARKER) ?? false;
    const volumeQs = cookable
      ? requesterVolume!.slice(1) // remove @
      : requesterVolume;

    // Get the cookies from the request headers
    const cookies = getCookies(req.headers);

    // Get the inline release from the cookie
    const volumeFromCookie = cookies[DECO_VOLUME_COOKIE_NAME];

    // Determine the inline release and whether a cookie should be added
    const [isolateVolume, shouldAddCookie] = volumeQs != null
      ? [
        volumeQs,
        (volumeQs !== volumeFromCookie) && cookable,
      ]
      : [volumeFromCookie, false];
    if (typeof isolateVolume !== "string") {
      return Promise.resolve(new Response(null, { status: 404 }));
    }
    let worker = this.workers.get(isolateVolume);
    if (!worker) {
      worker = new UserWorker({
        id: isolateVolume,
        cpuLimit: 1,
        memoryLimit: "512Mi",
        cwd: join(Deno.cwd(), USER_WORKERS_FOLDER, btoa(isolateVolume), "/"),
        envVars: {},
      });
      this.workers.set(isolateVolume, worker);
    }
    return worker.fetch(new Request(url, req)).then((response) => {
      if (shouldAddCookie) {
        setCookie(response.headers, {
          name: DECO_VOLUME_COOKIE_NAME,
          value: isolateVolume,
          path: "/",
          sameSite: "Strict",
        });
      }
      return response;
    });
  }
}
