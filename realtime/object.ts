// deno-lint-ignore-file no-explicit-any require-await
import { ensureDir } from "std/fs/ensure_dir.ts";
import { dirname, join } from "std/path/mod.ts";
import { RealtimeState } from "../deps.ts";

type RealtimeStorage = RealtimeState["storage"];
export class HypervisorMemStorage implements RealtimeStorage {
  private data: Map<string, any>;

  constructor() {
    this.data = new Map<string, any>();
  }

  async get<T = unknown>(key: string): Promise<T | undefined>;
  async get<T = unknown>(keys: string[]): Promise<Map<string, T>>;
  async get<T = unknown>(
    keys: string | string[],
  ): Promise<T | undefined | Map<string, T>> {
    if (Array.isArray(keys)) {
      const data = new Map<string, T>();
      keys.forEach((k) => {
        const value = this.data.get(k);
        if (value !== undefined) {
          data.set(k, value as T);
        }
      });
      return data;
    } else {
      const value = this.data.get(keys);
      return value !== undefined ? (value as T) : undefined;
    }
  }

  async delete(key: string): Promise<boolean>;
  async delete(keys: string[]): Promise<number>;
  async delete(keys: string | string[]): Promise<boolean | number> {
    if (Array.isArray(keys)) {
      let deletedCount = 0;
      keys.forEach((k) => {
        if (this.data.delete(k)) {
          deletedCount++;
        }
      });
      return deletedCount;
    } else {
      return this.data.delete(keys) ? true : false;
    }
  }

  async put<T>(key: string, value: T): Promise<void>;
  async put<T>(entries: Record<string, T>): Promise<void>;
  async put(
    key: string | Record<string, unknown>,
    value?: unknown,
  ): Promise<void> {
    if (typeof key === "string") {
      this.data.set(key, value as string);
    } else {
      for (const [entryKey, entryValue] of Object.entries(key)) {
        this.data.set(entryKey, entryValue as string);
      }
    }
  }

  async deleteAll(): Promise<void> {
    this.data.clear();
  }

  async list<T = unknown>(): Promise<Map<string, T>> {
    return new Map(this.data);
  }
}
export class HypervisorDiskStorage implements RealtimeStorage {
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
  storage: RealtimeStorage;
}
export class HypervisorRealtimeState<T = unknown> implements RealtimeState {
  private blockConcurrencyWhilePromise: Promise<T> | undefined;
  public storage: RealtimeStorage;
  constructor(options: HypervisorRealtimeStateOptions) {
    this.storage = options.storage;
  }

  blockConcurrencyWhile(cb: () => Promise<T>): Promise<T> {
    this.blockConcurrencyWhilePromise = cb();
    return this.blockConcurrencyWhilePromise;
  }

  public async wait() {
    return this?.blockConcurrencyWhilePromise ?? Promise.resolve();
  }
}
