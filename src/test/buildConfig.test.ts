// @vitest-environment node
import { describe, it, expect } from 'vitest';
import viteConfig from '../../vite.config';

describe('Vite Base Configuration for GitHub Pages', () => {
  it('should have base configured as relative path "./" to support subpath hosting', () => {
    // @ts-expect-error viteConfig might be a config function or object
    const config = typeof viteConfig === 'function' ? viteConfig({ command: 'build', mode: 'production' }) : viteConfig;
    expect(config.base).toBe('./');
  });
});
