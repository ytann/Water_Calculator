import { describe, it, expect } from 'vitest';
import { DashboardUI } from '../../src/dashboard/dashboard-ui';
import type { DashboardPayload } from '../../src/shared/types';

function fakePayload(overrides: Partial<DashboardPayload> = {}): DashboardPayload {
  return {
    totals: { waterMl: 12847, tokens: 4000, conversations: 14, firstDate: '2026-07-10T00:00:00.000Z' },
    byPlatform: [
      { platform: 'chatgpt', waterMl: 8200, tokens: 2500, count: 8 },
      { platform: 'gemini', waterMl: 3400, tokens: 1100, count: 5 },
      { platform: 'claude', waterMl: 1247, tokens: 400, count: 1 },
    ],
    byTopic: [
      { topic: 'Frontend', waterMl: 4200, tokens: 1300, count: 5 },
      { topic: 'Writing & Editing', waterMl: 3100, tokens: 950, count: 3 },
      { topic: 'Data & Analytics', waterMl: 2800, tokens: 850, count: 2 },
      { topic: 'AI / Machine Learning', waterMl: 1500, tokens: 450, count: 2 },
      { topic: 'Cooking & Food', waterMl: 800, tokens: 250, count: 1 },
      { topic: 'Uncategorized', waterMl: 447, tokens: 200, count: 1 },
    ],
    equivalents: [
      { label: 'Water bottles', value: 25.69, spriteKey: 'bottle', unit: 'bottles' },
      { label: 'Cactus rations', value: 3.89, spriteKey: 'cactus', unit: 'months' },
      { label: 'Bags of ice', value: 2.85, spriteKey: 'ice-bag', unit: 'bags' },
    ],
    topConversations: [
      { id: '1', url: 'https://chatgpt.com/c/1', platform: 'chatgpt', title: 'Debugging React SSR', waterMl: 4200, tokenCount: 1300, startedAt: '2026-07-10T00:00:00.000Z', updatedAt: '2026-07-11T00:00:00.000Z' },
      { id: '2', url: 'https://chatgpt.com/c/2', platform: 'gemini', title: 'Writing newsletter content', waterMl: 3100, tokenCount: 950, startedAt: '2026-07-10T00:00:00.000Z', updatedAt: '2026-07-11T00:00:00.000Z' },
    ],
    ...overrides,
  };
}

describe('DashboardUI', () => {
  it('creates root element on mount', () => {
    const container = document.createElement('div');
    const ui = new DashboardUI(container);
    ui.render(fakePayload());
    const root = container.querySelector('.wc-dashboard');
    expect(root).toBeTruthy();
  });

  it('displays total water in hero section', () => {
    const container = document.createElement('div');
    const ui = new DashboardUI(container);
    ui.render(fakePayload());
    expect(container.textContent).toContain('12.8');
  });

  it('shows conversations count in hero', () => {
    const container = document.createElement('div');
    const ui = new DashboardUI(container);
    ui.render(fakePayload());
    expect(container.textContent).toContain('14');
  });

  it('renders topic section with headings', () => {
    const container = document.createElement('div');
    const ui = new DashboardUI(container);
    ui.render(fakePayload());
    expect(container.textContent).toContain('WHERE YOUR WATER WENT');
  });

  it('renders equivalents section', () => {
    const container = document.createElement('div');
    const ui = new DashboardUI(container);
    ui.render(fakePayload());
    expect(container.textContent).toContain('UNDER A DIFFERENT LIGHT');
    expect(container.textContent).toContain('Water bottles');
  });

  it('renders top conversations section', () => {
    const container = document.createElement('div');
    const ui = new DashboardUI(container);
    ui.render(fakePayload());
    expect(container.textContent).toContain('Debugging React SSR');
  });

  it('renders footer with export button', () => {
    const container = document.createElement('div');
    const ui = new DashboardUI(container);
    ui.render(fakePayload());
    expect(container.textContent).toContain('Export');
  });

  it('handles empty data', () => {
    const container = document.createElement('div');
    const ui = new DashboardUI(container);
    ui.render(fakePayload({
      totals: { waterMl: 0, tokens: 0, conversations: 0, firstDate: new Date(0).toISOString() },
      byPlatform: [],
      byTopic: [],
      equivalents: [],
      topConversations: [],
    }));
    expect(container.textContent).toContain('0');
  });
});
