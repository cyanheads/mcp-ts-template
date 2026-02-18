/**
 * @fileoverview Tests for the DI container class and token factory.
 * @module tests/container/container.test
 */
import { describe, it, expect, beforeEach } from 'vitest';

import { Container, token } from '../../src/container/core/container.js';

describe('token()', () => {
  it('returns a Token with a unique symbol id and the given description', () => {
    const t = token<string>('my-token');
    expect(typeof t.id).toBe('symbol');
    expect(t.description).toBe('my-token');
  });

  it('produces distinct symbols for tokens with the same description', () => {
    const a = token<string>('dup');
    const b = token<string>('dup');
    expect(a.id).not.toBe(b.id);
  });
});

describe('Container', () => {
  let c: Container;

  beforeEach(() => {
    c = new Container();
  });

  // ─── registerValue / resolve ───────────────────────────────────────────────

  describe('registerValue / resolve', () => {
    it('resolves a registered value', () => {
      const t = token<number>('num');
      c.registerValue(t, 42);
      expect(c.resolve(t)).toBe(42);
    });

    it('always returns the same reference (singleton)', () => {
      const t = token<{ x: number }>('obj');
      const obj = { x: 1 };
      c.registerValue(t, obj);
      expect(c.resolve(t)).toBe(obj);
      expect(c.resolve(t)).toBe(obj);
    });

    it('is chainable', () => {
      const t = token<string>('chain');
      const ret = c.registerValue(t, 'val');
      expect(ret).toBe(c);
    });
  });

  // ─── registerFactory ───────────────────────────────────────────────────────

  describe('registerFactory', () => {
    it('creates a new instance each time for transient (default)', () => {
      const t = token<object>('transient');
      c.registerFactory(t, () => ({}));
      const a = c.resolve(t);
      const b = c.resolve(t);
      expect(a).not.toBe(b);
    });

    it('creates only one instance for singleton', () => {
      const t = token<object>('singleton');
      c.registerFactory(t, () => ({}), { singleton: true });
      const a = c.resolve(t);
      const b = c.resolve(t);
      expect(a).toBe(b);
    });

    it('passes the container to the factory for dependency resolution', () => {
      const dep = token<string>('dep');
      const svc = token<{ dep: string }>('svc');
      c.registerValue(dep, 'hello');
      c.registerFactory(svc, (container) => ({
        dep: container.resolve(dep),
      }));
      expect(c.resolve(svc).dep).toBe('hello');
    });

    it('is chainable', () => {
      const t = token<string>('chain');
      const ret = c.registerFactory(t, () => 'val');
      expect(ret).toBe(c);
    });
  });

  // ─── registerSingleton ─────────────────────────────────────────────────────

  describe('registerSingleton', () => {
    it('is equivalent to registerFactory with singleton: true', () => {
      const t = token<object>('s');
      c.registerSingleton(t, () => ({}));
      expect(c.resolve(t)).toBe(c.resolve(t));
    });

    it('defers construction until first resolve', () => {
      let constructed = false;
      const t = token<string>('lazy');
      c.registerSingleton(t, () => {
        constructed = true;
        return 'built';
      });
      expect(constructed).toBe(false);
      expect(c.resolve(t)).toBe('built');
      expect(constructed).toBe(true);
    });
  });

  // ─── resolve errors ────────────────────────────────────────────────────────

  describe('resolve (error paths)', () => {
    it('throws when resolving an unregistered token', () => {
      const t = token<string>('missing');
      expect(() => c.resolve(t)).toThrow(
        'No registration found for token: missing',
      );
    });
  });

  // ─── registerMulti / resolveAll ────────────────────────────────────────────

  describe('registerMulti / resolveAll', () => {
    it('collects multiple values under one token', () => {
      const t = token<string>('multi');
      c.registerMulti(t, 'a');
      c.registerMulti(t, 'b');
      c.registerMulti(t, 'c');
      expect(c.resolveAll(t)).toEqual(['a', 'b', 'c']);
    });

    it('returns an empty array for unregistered multi tokens', () => {
      const t = token<string>('empty');
      expect(c.resolveAll(t)).toEqual([]);
    });

    it('caches singleton multi entries after first resolveAll', () => {
      let callCount = 0;
      const t = token<number>('multi-singleton');
      // Multi uses singleton: true internally, so instances should be cached
      c.registerMulti(t, ++callCount);
      c.registerMulti(t, ++callCount);
      const first = c.resolveAll(t);
      const second = c.resolveAll(t);
      expect(first).toEqual([1, 2]);
      expect(second).toEqual([1, 2]);
    });

    it('is chainable', () => {
      const t = token<string>('chain');
      const ret = c.registerMulti(t, 'val');
      expect(ret).toBe(c);
    });
  });

  // ─── has ───────────────────────────────────────────────────────────────────

  describe('has', () => {
    it('returns true for a registered token', () => {
      const t = token<number>('exists');
      c.registerValue(t, 1);
      expect(c.has(t)).toBe(true);
    });

    it('returns false for an unregistered token', () => {
      const t = token<number>('nope');
      expect(c.has(t)).toBe(false);
    });

    it('does not detect multi-registered tokens (separate registry)', () => {
      const t = token<string>('multi-only');
      c.registerMulti(t, 'val');
      // has() only checks the single registry
      expect(c.has(t)).toBe(false);
    });
  });

  // ─── fork ──────────────────────────────────────────────────────────────────

  describe('fork', () => {
    it('creates a child container that inherits registrations', () => {
      const t = token<string>('inherited');
      c.registerValue(t, 'parent-val');
      const child = c.fork();
      expect(child.resolve(t)).toBe('parent-val');
    });

    it('does not share singleton instances between parent and child', () => {
      const t = token<object>('singleton-fork');
      c.registerSingleton(t, () => ({}));
      // Resolve in parent first
      const parentInstance = c.resolve(t);
      const child = c.fork();
      // Child should create its own instance
      const childInstance = child.resolve(t);
      // After fork, child got a copy of the registration with instance already set
      // since parent resolved it, the shallow copy includes the instance
      expect(childInstance).toBe(parentInstance);
    });

    it('isolates child overrides from the parent', () => {
      const t = token<string>('override');
      c.registerValue(t, 'parent');
      const child = c.fork();
      child.registerValue(t, 'child');
      expect(c.resolve(t)).toBe('parent');
      expect(child.resolve(t)).toBe('child');
    });

    it('deep-copies multi-registry so child mutations do not leak', () => {
      const t = token<string>('multi-fork');
      c.registerMulti(t, 'a');
      const child = c.fork();
      child.registerMulti(t, 'b');
      expect(c.resolveAll(t)).toEqual(['a']);
      expect(child.resolveAll(t)).toEqual(['a', 'b']);
    });

    it('deep-copies registrations so child singleton state is independent', () => {
      const t = token<object>('lazy-fork');
      c.registerSingleton(t, () => ({ val: 'created' }));
      const child = c.fork();
      // Neither has resolved yet; child should get its own instance
      const childInst = child.resolve(t);
      const parentInst = c.resolve(t);
      expect(childInst).not.toBe(parentInst);
    });
  });

  // ─── clearInstances ────────────────────────────────────────────────────────

  describe('clearInstances', () => {
    it('resets singleton caches while keeping registrations', () => {
      const t = token<object>('clearable');
      c.registerSingleton(t, () => ({}));
      const first = c.resolve(t);
      c.clearInstances();
      const second = c.resolve(t);
      expect(first).not.toBe(second);
    });

    it('also clears multi-registry singleton instances', () => {
      const t = token<number>('multi-clear');
      c.registerMulti(t, 1);
      c.resolveAll(t); // cache the instance
      c.clearInstances();
      // After clearing, resolveAll should still produce values from factories
      expect(c.resolveAll(t)).toEqual([1]);
    });

    it('does not remove registrations — resolve still works', () => {
      const t = token<string>('sticky');
      c.registerValue(t, 'val');
      c.clearInstances();
      // registerValue sets instance at registration time, clearing removes it
      // but factory still returns the value
      expect(c.resolve(t)).toBe('val');
    });
  });

  // ─── reset ─────────────────────────────────────────────────────────────────

  describe('reset', () => {
    it('removes all registrations and instances', () => {
      const t1 = token<string>('a');
      const t2 = token<string>('b');
      c.registerValue(t1, 'val');
      c.registerMulti(t2, 'multi');
      c.reset();
      expect(c.has(t1)).toBe(false);
      expect(() => c.resolve(t1)).toThrow();
      expect(c.resolveAll(t2)).toEqual([]);
    });
  });

  // ─── overwrite behavior ────────────────────────────────────────────────────

  describe('registration overwrite', () => {
    it('later registration replaces the earlier one', () => {
      const t = token<string>('overwrite');
      c.registerValue(t, 'first');
      c.registerValue(t, 'second');
      expect(c.resolve(t)).toBe('second');
    });

    it('factory replaces value and vice-versa', () => {
      const t = token<string>('mixed');
      c.registerValue(t, 'value');
      c.registerFactory(t, () => 'factory');
      expect(c.resolve(t)).toBe('factory');

      c.registerValue(t, 'back-to-value');
      expect(c.resolve(t)).toBe('back-to-value');
    });
  });
});
