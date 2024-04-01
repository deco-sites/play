import { handleCommand } from "./commands/command.ts";
import { RunnerOptions } from "./commands/run.ts";

export interface WorkerState {
  id?: string;
  options?: RunnerOptions;
  socket?: string;
  running: boolean;
  err?: string;
}

const UNCLONNABLE_PROPS: Array<keyof WorkerState> = [];

let STATE: WorkerState = {
  running: false,
};
const serialize = (state: WorkerState): WorkerState => {
  if (UNCLONNABLE_PROPS.length === 0) {
    return state;
  }
  const copy = { ...state };
  for (const prop of UNCLONNABLE_PROPS) {
    delete copy[prop];
  }
  return copy;
};
// @ts-ignore: trust-me
self.onmessage = async (evt: { data: { id: string; command: Command } }) => {
  const cmd = evt.data;
  STATE = await handleCommand(STATE, cmd.command).catch((err) => {
    return { ...STATE, err: err.message };
  });
  // @ts-ignore: trust-me
  self.postMessage({
    state: serialize(STATE),
    id: cmd.id,
  });
};
