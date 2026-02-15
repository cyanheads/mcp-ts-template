/**
 * @fileoverview Minimal type-safe DI container.
 * No decorators, no reflect-metadata, no external dependencies.
 * Supports singleton/transient factories, static values, and multi-registration.
 * @module src/container/container
 */

/**
 * A typed DI token. The phantom type `T` carries the resolved value type,
 * enabling fully type-safe resolution without casts.
 */
export interface Token<T> {
  readonly id: symbol;
  readonly description: string;
  /** Phantom brand — never used at runtime. */
  readonly _type?: T;
}

/** Create a typed DI token. */
export function token<T>(description: string): Token<T> {
  return { id: Symbol(description), description } as Token<T>;
}

type Factory<T> = (container: Container) => T;

interface Registration<T> {
  factory: Factory<T>;
  singleton: boolean;
  instance?: T;
}

export class Container {
  private registry = new Map<symbol, Registration<unknown>>();
  private multiRegistry = new Map<symbol, Registration<unknown>[]>();

  /** Register a pre-built value (always singleton). */
  registerValue<T>(token: Token<T>, value: T): this {
    this.registry.set(token.id, {
      factory: () => value,
      singleton: true,
      instance: value,
    });
    return this;
  }

  /** Register a factory. Optionally singleton (default: transient). */
  registerFactory<T>(
    token: Token<T>,
    factory: Factory<T>,
    opts?: { singleton?: boolean },
  ): this {
    this.registry.set(token.id, {
      factory: factory as Factory<unknown>,
      singleton: opts?.singleton ?? false,
    });
    return this;
  }

  /** Register a singleton factory. Convenience wrapper. */
  registerSingleton<T>(token: Token<T>, factory: Factory<T>): this {
    return this.registerFactory(token, factory, { singleton: true });
  }

  /** Add a value to a multi-registration token (always collected into an array). */
  registerMulti<T>(token: Token<T>, value: T): this {
    const arr = this.multiRegistry.get(token.id) ?? [];
    arr.push({
      factory: () => value,
      singleton: true,
      instance: value,
    });
    this.multiRegistry.set(token.id, arr);
    return this;
  }

  /** Resolve a single registration. Throws if not found. */
  resolve<T>(token: Token<T>): T {
    const reg = this.registry.get(token.id);
    if (!reg) {
      throw new Error(`No registration found for token: ${token.description}`);
    }
    if (reg.singleton) {
      if (reg.instance === undefined) {
        reg.instance = reg.factory(this);
      }
      return reg.instance as T;
    }
    return reg.factory(this) as T;
  }

  /** Resolve all values registered under a multi-token. Returns empty array if none. */
  resolveAll<T>(token: Token<T>): T[] {
    const regs = this.multiRegistry.get(token.id);
    if (!regs) return [];
    return regs.map((reg) => {
      if (reg.singleton && reg.instance !== undefined) return reg.instance as T;
      const val = reg.factory(this);
      if (reg.singleton) reg.instance = val;
      return val as T;
    });
  }

  /** Check if a token is registered. */
  has<T>(token: Token<T>): boolean {
    return this.registry.has(token.id);
  }

  /** Create a child container that inherits registrations from this container. */
  fork(): Container {
    const child = new Container();
    child.registry = new Map(
      [...this.registry.entries()].map(([k, v]) => [k, { ...v }]),
    );
    child.multiRegistry = new Map(
      [...this.multiRegistry.entries()].map(([k, v]) => [
        k,
        v.map((r) => ({ ...r })),
      ]),
    );
    return child;
  }

  /** Clear all singleton instances (for test isolation). Registrations remain. */
  clearInstances(): void {
    for (const reg of this.registry.values()) {
      reg.instance = undefined;
    }
    for (const regs of this.multiRegistry.values()) {
      for (const reg of regs) {
        reg.instance = undefined;
      }
    }
  }

  /** Full reset — remove all registrations and instances. */
  reset(): void {
    this.registry.clear();
    this.multiRegistry.clear();
  }
}

/** The global container instance. */
export const container = new Container();
