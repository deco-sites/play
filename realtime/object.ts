import { RealtimeState } from "../deps.ts";
import { dirname, join } from "std/path/mod.ts";
import { ensureDir } from "std/fs/ensure_dir.ts";

type RealtimeStorage = RealtimeState["storage"];

export class HypervisorStorage implements RealtimeStorage {
  constructor(private dir: string) {}

  async get<T = unknown>(key: string): Promise<T | undefined>;
  async get<T = unknown>(keys: string[]): Promise<Map<string, T>>;
  async get<T = unknown>(
    keys: string | string[],
  ): Promise<T | undefined | Map<string, T>> {
    const filePaths = Array.isArray(keys)
      ? keys.map((k) => join(this.dir, k))
      : join(this.dir, keys);
    try {
      if (Array.isArray(keys)) {
        const data = new Map<string, T>();
        for (const filePath of filePaths) {
          const fileContent = await Deno.readTextFile(filePath);
          data.set(filePath.split("/").pop()!, fileContent as T);
        }
        return data;
      } else {
        const fileContent = await Deno.readTextFile(filePaths as string);
        return fileContent as T;
      }
    } catch (_error) {
      console.error("error getting keys", _error);
      return undefined;
    }
  }

  async delete(key: string): Promise<boolean>;
  async delete(keys: string[]): Promise<number>;
  async delete(keys: string | string[]): Promise<boolean | number> {
    const filePaths = Array.isArray(keys)
      ? keys.map((k) => join(this.dir, k))
      : join(this.dir, keys);
    try {
      let deletedCount = 0;
      for (const filePath of filePaths) {
        await Deno.remove(filePath);
        deletedCount++;
      }
      return Array.isArray(keys) ? deletedCount : true;
    } catch (_error) {
      console.error("error deleting keys", _error);

      return Array.isArray(keys) ? 0 : false;
    }
  }

  async put<T>(key: string, value: T): Promise<void>;
  async put<T>(entries: Record<string, T>): Promise<void>;
  async put(
    key: string | Record<string, unknown>,
    value?: unknown,
  ): Promise<void> {
    const entries = typeof key === "string" ? { [key]: value } : key;
    for (const [entryKey, entryValue] of Object.entries(entries)) {
      const filePath = join(this.dir, entryKey);
      await ensureDir(dirname(filePath));
      await Deno.writeTextFile(filePath, entryValue as string);
    }
  }

  async deleteAll(): Promise<void> {
    const dirEntries = Deno.readDir(this.dir);
    try {
      for await (const dirEntry of dirEntries) {
        await Deno.remove(join(this.dir, dirEntry.name), { recursive: true });
      }
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) {
        return;
      }
      throw err;
    }
  }

  async list<T = unknown>(): Promise<Map<string, T>> {
    const data = new Map<string, T>();
    const dirEntries = Deno.readDir(this.dir);
    try {
      for await (const dirEntry of dirEntries) {
        if (dirEntry.isDirectory) continue;
        const fileContent = await Deno.readTextFile(
          join(this.dir, dirEntry.name),
        );
        data.set(dirEntry.name, fileContent as T);
      }
      return data;
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) {
        return new Map();
      }
      throw err;
    }
  }
}

export interface HypervisorRealtimeStateOptions {
  dir: string;
}
export class HypervisorRealtimeState<T = unknown> implements RealtimeState {
  private blockConcurrencyWhileResolvers: ReturnType<
    typeof Promise.withResolvers<T>
  >;
  public storage: RealtimeStorage;
  constructor(options: HypervisorRealtimeStateOptions) {
    this.blockConcurrencyWhileResolvers = Promise.withResolvers<T>();
    this.storage = new HypervisorStorage(options.dir);
  }

  blockConcurrencyWhile(cb: () => Promise<T>): Promise<T> {
    cb().then(this.blockConcurrencyWhileResolvers.resolve).catch(
      this.blockConcurrencyWhileResolvers.reject,
    );
    return this.blockConcurrencyWhileResolvers.promise;
  }

  async wait() {}
}
