import { BaseCommand } from "./command.ts";

export interface RunnerOptions {
  envVars: { [key: string]: string };
  cwd: string;
  port: number;
  id: string;
}

export interface RunCommand extends BaseCommand, RunnerOptions {
  name: "run";
}
