import type { DashboardPayload } from '../shared/types';
import { renderPixelDonut } from './charts';
import { SPRITES, renderSprite } from './sprites';

const TOPIC_COLORS = [
  '#2d6a9f', '#4fa8d8', '#1a5c3a', '#3a8c5c', '#f4a261', '#e76f51',
  '#b5838d', '#7f4f24', '#6d597a', '#4a5759', '#a98467', '#283618',
  '#606c38', '#bc6c25', '#dda15e', '#264653', '#2a9d8f', '#e9c46a',
  '#6b705c', '#9b5de5', '#f15bb5', '#00bbf9', '#00f5d4', '#fee440',
];

function formatVolume(ml: number): string {
  if (ml >= 1000) return `${(ml / 1000).toFixed(1)} L`;
  return `${ml.toFixed(0)} ml`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function el(tag: string, className: string, styles?: string): HTMLElement {
  const e = document.createElement(tag);
  e.className = className;
  if (styles) e.style.cssText = styles;
  return e;
}

export class DashboardUI {
  private root: HTMLElement;

  constructor(private container: HTMLElement) {
    this.root = el('div', '', 'max-width:680px;margin:0 auto;padding:48px 24px 64px;position:relative;z-index:1;');
    this.root.id = 'wc-dashboard';
    this.root.className = 'wc-dashboard';
    this.container.appendChild(this.root);
    this.initParticles();
  }

  render(data: DashboardPayload): void {
    this.root.innerHTML = '';
    this.root.appendChild(this.renderHero(data));
    this.root.appendChild(this.renderSection('WHERE YOUR WATER WENT', this.renderTopics(data)));
    this.root.appendChild(this.renderSection('PLATFORMS', this.renderPlatforms(data)));
    this.root.appendChild(this.renderSection('UNDER A DIFFERENT LIGHT', this.renderEquivalents(data)));
    this.root.appendChild(this.renderSection('TOP CONVERSATIONS', this.renderTopConversations(data)));
    this.root.appendChild(this.renderFooter(data));
  }

  /* ================================================================
     BACKGROUND PARTICLES
     ================================================================ */
  private initParticles(): void {
    const canvas = document.getElementById('bg-canvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    const c = canvas;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const cx = ctx;

    function resize() { c.width = window.innerWidth; c.height = window.innerHeight; }
    resize();
    window.addEventListener('resize', resize);

    const drops: { x: number; y: number; speed: number; size: number; alpha: number }[] = [];
    for (let i = 0; i < 50; i++) {
      drops.push({
        x: Math.random() * c.width,
        y: Math.random() * c.height,
        speed: 0.2 + Math.random() * 0.6,
        size: 1 + Math.random() * 1.5,
        alpha: 0.1 + Math.random() * 0.15,
      });
    }

    function draw() {
      cx.clearRect(0, 0, c.width, c.height);
      for (const d of drops) {
        d.y += d.speed;
        if (d.y > c.height) { d.y = -10; d.x = Math.random() * c.width; }
        cx.fillStyle = `rgba(79,168,216,${d.alpha})`;
        cx.fillRect(Math.round(d.x), Math.round(d.y), d.size, d.size * 2 + 1);
      }
      requestAnimationFrame(draw);
    }
    draw();
  }

  /* ================================================================
     SECTION WRAPPER
     ================================================================ */
  private renderSection(title: string, content: HTMLElement): HTMLElement {
    const sec = el('div', 'wc-section');

    const header = el('div', 'wc-section-header');
    const label = el('span', 'label');
    label.textContent = title;
    header.appendChild(label);

    sec.appendChild(header);
    sec.appendChild(content);
    return sec;
  }

  /* ================================================================
     HERO
     ================================================================ */
  private renderHero(data: DashboardPayload): HTMLElement {
    const hero = el('div', 'wc-hero');

    const wrap = el('div', 'wc-hero-canvas-wrap');
    const glow = el('div', 'wc-hero-glow');
    wrap.appendChild(glow);

    const canvas = document.createElement('canvas');
    canvas.width = 96;
    canvas.height = 96;
    canvas.style.cssText = 'image-rendering:pixelated;position:relative;z-index:1;';
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const bottle = SPRITES['bottle'];
      renderSprite(ctx, bottle, 32, 14, 1);

      if (data.totals.waterMl > 0) {
        const maxHeight = 48;
        const maxMl = 5000;
        const fillPct = Math.min(data.totals.waterMl / maxMl, 1);
        const fillH = Math.floor(fillPct * maxHeight);
        if (fillH > 1) {
          const fillCanvas = document.createElement('canvas');
          fillCanvas.width = 96; fillCanvas.height = 96;
          const fctx = fillCanvas.getContext('2d');
          if (fctx) {
            renderSprite(fctx, bottle, 32, 14, 1);
            fctx.globalCompositeOperation = 'source-in';
            const startY = 14 + 48 - fillH;
            fctx.fillStyle = '#4fa8d8';
            fctx.fillRect(32, startY, 32, fillH);

            ctx.drawImage(fillCanvas, 0, 0);
            ctx.globalAlpha = 0.4;
            ctx.fillStyle = '#2d6a9f';
            for (let r = 0; r < fillH; r += 4) {
              if ((r / 4) % 3 === 0) {
                ctx.fillRect(34, 14 + 48 - fillH + r, 28, 2);
              }
            }
            ctx.globalAlpha = 1;
          }
        }
      }
    }
    wrap.appendChild(canvas);
    hero.appendChild(wrap);

    const total = el('div', 'wc-hero-total');
    const waterIcon = document.createElement('span');
    waterIcon.textContent = '\u{1F4A7} ';
    total.appendChild(waterIcon);
    total.appendChild(document.createTextNode(formatVolume(data.totals.waterMl)));
    hero.appendChild(total);

    const since = el('div', 'wc-hero-since');
    since.textContent = `since ${formatDate(data.totals.firstDate)}`;
    hero.appendChild(since);

    const count = el('div', 'wc-hero-count');
    count.textContent = `${data.totals.conversations} conversations`;
    hero.appendChild(count);

    if (data.totals.waterMl >= 1) {
      const detail = el('div', 'wc-hero-detail');
      const liters = (data.totals.waterMl / 1000).toFixed(2);
      const tokens = data.totals.tokens.toLocaleString();
      detail.textContent = `${liters} L water \u00B7 ${tokens} tokens`;
      hero.appendChild(detail);
    }

    return hero;
  }

  /* ================================================================
     TOPICS (DONUT CHART + LEGEND)
     ================================================================ */
  private renderTopics(data: DashboardPayload): HTMLElement {
    if (data.byTopic.length === 0) {
      const empty = el('div', 'wc-empty');
      empty.textContent = 'No topics yet';
      return empty;
    }

    const row = el('div', 'wc-topics-row');

    const chartWrap = el('div', 'wc-topics-chart');
    const canvas = document.createElement('canvas');
    canvas.width = 180; canvas.height = 180;
    canvas.style.cssText = 'image-rendering:pixelated;';
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const top5 = data.byTopic.slice(0, 5);
      const other = data.byTopic.slice(5);
      const otherWater = other.reduce((s, t) => s + t.waterMl, 0);
      const slices = top5.map((t, i) => ({
        label: t.topic, value: t.waterMl, color: TOPIC_COLORS[i % TOPIC_COLORS.length],
      }));
      if (otherWater > 0) slices.push({ label: 'Other', value: otherWater, color: '#4a5759' });
      renderPixelDonut(ctx, slices, 90, 90, 72, 42, 8);
    }
    chartWrap.appendChild(canvas);
    row.appendChild(chartWrap);

    const legend = el('div', 'wc-topics-legend');
    const topForLegend = data.byTopic.slice(0, 8);
    for (let i = 0; i < topForLegend.length; i++) {
      const t = topForLegend[i];
      const item = el('div', 'wc-legend-item');
      item.style.animationDelay = `${0.1 + i * 0.05}s`;

      const swatch = el('span', 'wc-legend-swatch');
      swatch.style.background = TOPIC_COLORS[i % TOPIC_COLORS.length];
      item.appendChild(swatch);

      const lbl = el('span', 'wc-legend-label');
      lbl.textContent = t.topic;
      item.appendChild(lbl);

      const val = el('span', 'wc-legend-value');
      val.textContent = formatVolume(t.waterMl);
      item.appendChild(val);

      legend.appendChild(item);
    }
    row.appendChild(legend);

    return row;
  }

  /* ================================================================
     PLATFORMS (BAR CHART)
     ================================================================ */
  private renderPlatforms(data: DashboardPayload): HTMLElement {
    if (data.byPlatform.length === 0) {
      const empty = el('div', 'wc-empty');
      empty.textContent = 'No data yet';
      return empty;
    }

    const wrap = document.createElement('div');
    const maxVal = Math.max(...data.byPlatform.map(p => p.waterMl), 1);

    data.byPlatform.forEach((p, i) => {
      const row = el('div', 'wc-bar-row');

      const label = el('div', 'wc-bar-label');
      label.textContent = p.platform;
      row.appendChild(label);

      const track = el('div', 'wc-bar-track');
      const fill = el('div', 'wc-bar-fill');
      const w = (p.waterMl / maxVal) * 100;
      fill.style.width = `${w}%`;
      fill.style.animationDelay = `${0.2 + i * 0.1}s`;
      fill.style.background = i === 0
        ? `linear-gradient(90deg, ${TOPIC_COLORS[i]}, ${TOPIC_COLORS[i]}dd)`
        : `linear-gradient(90deg, ${TOPIC_COLORS[i % TOPIC_COLORS.length]}, ${TOPIC_COLORS[i % TOPIC_COLORS.length]}cc)`;
      track.appendChild(fill);
      row.appendChild(track);

      const val = el('div', 'wc-bar-value');
      val.textContent = formatVolume(p.waterMl);
      row.appendChild(val);

      wrap.appendChild(row);
    });

    return wrap;
  }

  /* ================================================================
     EQUIVALENTS (SPRITE GRID)
     ================================================================ */
  private renderEquivalents(data: DashboardPayload): HTMLElement {
    if (data.equivalents.length === 0) {
      const empty = el('div', 'wc-empty');
      empty.textContent = 'Have a chat to see your water in a new light';
      return empty;
    }

    const grid = el('div', 'wc-equiv-grid');

    data.equivalents.forEach((eq, i) => {
      const card = el('div', 'wc-equiv-card');
      card.style.animationDelay = `${0.1 + i * 0.08}s`;

      const spriteCanvas = document.createElement('canvas');
      spriteCanvas.width = 32;
      spriteCanvas.height = 32;
      spriteCanvas.style.cssText = 'image-rendering:pixelated;margin-bottom:8px;';
      const ctx = spriteCanvas.getContext('2d');
      const sprite = SPRITES[eq.spriteKey];
      if (ctx && sprite) renderSprite(ctx, sprite, 0, 0, 1);
      card.appendChild(spriteCanvas);

      const num = el('div', 'wc-equiv-number');
      const formatted = eq.value >= 1000
        ? eq.value.toLocaleString('en-US', { maximumFractionDigits: 0 })
        : eq.value.toFixed(1).replace(/\.0$/, '');
      num.textContent = `\u2248 ${formatted}`;
      card.appendChild(num);

      const name = el('div', 'wc-equiv-label');
      name.textContent = eq.label;
      card.appendChild(name);

      grid.appendChild(card);
    });

    return grid;
  }

  /* ================================================================
     TOP CONVERSATIONS
     ================================================================ */
  private renderTopConversations(data: DashboardPayload): HTMLElement {
    if (data.topConversations.length === 0) {
      const empty = el('div', 'wc-empty');
      empty.textContent = 'No conversations yet';
      return empty;
    }

    const wrap = document.createElement('div');

    data.topConversations.forEach((conv, i) => {
      const row = el('div', 'wc-conv-row');
      row.style.animationDelay = `${0.1 + i * 0.08}s`;

      const rank = el('div', 'wc-conv-rank');
      rank.textContent = `#${i + 1}`;
      if (i === 0) rank.classList.add('gold');
      row.appendChild(rank);

      const title = el('div', 'wc-conv-title');
      title.textContent = conv.title;
      row.appendChild(title);

      const water = el('div', 'wc-conv-water');
      water.textContent = formatVolume(conv.waterMl);
      row.appendChild(water);

      wrap.appendChild(row);
    });

    return wrap;
  }

  /* ================================================================
     FOOTER
     ================================================================ */
  private renderFooter(_data: DashboardPayload): HTMLElement {
    const footer = el('div', 'wc-footer');

    const cite = el('div', 'wc-footer-cite');
    cite.textContent = '1 token = 0.003 ml water (inference only)';
    footer.appendChild(cite);

    const exportBtn = el('button', 'wc-btn');
    exportBtn.textContent = 'Export as JSON';
    exportBtn.addEventListener('click', () => this.handleExport());
    footer.appendChild(exportBtn);

    return footer;
  }

  private async handleExport(): Promise<void> {
    try {
      const { IndexedDBStore } = await import('../shared/db');
      const db = new IndexedDBStore();
      const records = await db.findAll();
      const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `token-wuer-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* silent */ }
  }
}
