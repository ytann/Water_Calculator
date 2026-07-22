import { IndexedDBStore } from '../shared/db';
import { TopicCategorizer } from './categorizer';
import { EquivalentGenerator } from './equivalents';
import { DashboardAggregator } from './aggregator';
import { DashboardUI } from './dashboard-ui';

async function main(): Promise<void> {
  const root = document.getElementById('dashboard-root');
  if (!root) return;

  const store = new IndexedDBStore();
  const categorizer = new TopicCategorizer();
  const equivalents = new EquivalentGenerator();
  const aggregator = new DashboardAggregator(store, categorizer, equivalents);

  const data = await aggregator.generate();
  const ui = new DashboardUI(root);
  ui.render(data);
}

main().catch((err) => {
  const root = document.getElementById('dashboard-root');
  if (root) {
    root.textContent = `Dashboard failed to load: ${err instanceof Error ? err.message : String(err)}`;
  }
  console.error('[wc] dashboard error:', err);
});
