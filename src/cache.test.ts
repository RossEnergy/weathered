import Cache from './cache';
import { describe, it, expect } from 'vitest';

describe('Cache', () => {
  it('returns undefined for missing keys', () => {
    const cache = new Cache();
    expect(cache.get('missing')).toBe(undefined);
  });

  it('returns a cached value', () => {
    const cache = new Cache<string>();
    cache.set('hey', 'dude');
    expect(cache.get('hey')).toBe('dude');
  });
});
