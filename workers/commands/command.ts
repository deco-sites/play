import { exists } from "std/fs/mod.ts";
import { join } from "std/path/mod.ts";
import { WorkerState } from "../runner.ts";
import { RunCommand } from "./run.ts";
import { StopCommand } from "./stop.ts";

export interface BaseCommand {
  name: string;
}

export type Command = RunCommand | StopCommand;

const commandHandlers: Record<
  Command["name"],
  // deno-lint-ignore no-explicit-any
  (state: WorkerState, cmd: any) => Promise<WorkerState>
> = {
  stop: (state, _cmd) => {
    return Promise.resolve(state);
  },
  run: async (state, cmd: RunCommand) => {
    for (const [key, value] of Object.entries(cmd.envVars)) {
      Deno.env.set(key, value);
    }
    Deno.cwd = () => {
      return cmd.cwd;
    };
    //const { resolve, promise } = Promise.withResolvers<void>();
    // Deno.serve({
    //   onListen({ path }) {
    //     console.log(`Server started at ${path}`);
    //     resolve();
    //     // ... more info specific to your server ..
    //   },
    //   path: join(Deno.cwd(), "main.ts"),
    // }, (_req) => new Response("Hello, world"));
    const pathTs = join(Deno.cwd(), "main.ts");
    if (!await exists(pathTs)) {
      throw new Error(`main.ts not found for ${cmd.cwd}`);
    }
    import(pathTs); // do not await?
    return {
      ...state,
      id: cmd.id,
      running: true,
      options: cmd,
    };
  },
};

export const handleCommand = (
  state: WorkerState,
  cmd: Command,
): Promise<WorkerState> => {
  const handler = commandHandlers[cmd.name];
  if (!handler) {
    throw new Error(`Command handler not found for ${cmd.name}`);
  }
  return handler(state, cmd);
};
