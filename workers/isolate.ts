export interface Isolate extends AsyncDisposable {
  isRunning: () => Promise<boolean>;
  waitUntilReady: (timeoutMs?: number) => Promise<void>;
  fetch: (req: Request) => Promise<Response>;
}

export interface IsolateOptions {
  envVars: { [key: string]: string };
  cwd: string;
  permissions?: Deno.PermissionOptionsObject;
}
