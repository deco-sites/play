export interface Isolate extends AsyncDisposable {
  isRunning: () => boolean;
  waitUntilReady: (timeoutMs?: number) => Promise<void>;
  fetch: (req: Request) => Promise<Response>;
  start: () => void;
}

export interface IsolateOptions {
  envVars: { [key: string]: string };
  cwd: string;
  permissions?: Deno.PermissionOptionsObject;
}
