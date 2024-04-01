import { BaseCommand } from "./command.ts";

export interface StopCommand extends BaseCommand {
  name: "stop";
}
