import { describe, expect, it } from 'vitest';
import { getAppRoute, withBasePath } from '../../src/app/routing';

describe('deployment base routing', () => {
  it('routes the app and landing page correctly when deployed under a GitHub Pages project path', () => {
    expect(getAppRoute('/phosphene/', '/phosphene/')).toBe('app');
    expect(getAppRoute('/phosphene/landing/', '/phosphene/')).toBe('landing');
    expect(getAppRoute('/phosphene/landing/index.html', '/phosphene/')).toBe('landing');
  });

  it('preserves root deployment behavior for the AI-node loopback service', () => {
    expect(getAppRoute('/', '/')).toBe('app');
    expect(getAppRoute('/landing/', '/')).toBe('landing');
  });

  it('prefixes public asset and app links with the configured deployment base', () => {
    expect(withBasePath('/landing/assets/phosphene-demo-v0.1.42.gif', '/phosphene/')).toBe(
      '/phosphene/landing/assets/phosphene-demo-v0.1.42.gif'
    );
    expect(withBasePath('/', '/phosphene/')).toBe('/phosphene/');
    expect(withBasePath('/landing/assets/phosphene-demo-v0.1.42.gif', '/')).toBe(
      '/landing/assets/phosphene-demo-v0.1.42.gif'
    );
  });
});
