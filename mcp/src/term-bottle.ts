// Terminal inline bottle — Unicode half-blocks + ANSI true color
const GRID_COLS = 16;
const GRID_ROWS = 28;

const BOTTLE_GRID = new Uint8Array([
  0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
  0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,
  0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,
  0,0,0,0,0,1,1,0,0,1,1,0,0,0,0,0,
  0,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0,
  0,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0,
  0,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0,
  0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,
  0,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0,
  0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,
  0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,
  0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,
  0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,
  0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,
  0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,
  0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,
  0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,
  0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,
  0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,
  0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,
  0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,
  0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,
  0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,
  0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,
  0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,
  0,0,0,0,0,1,1,0,0,1,1,0,0,0,0,0,
  0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,
  0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
]);

interface TermColors {
  bottle: [number, number, number];
  cap: [number, number, number];
  highlight: [number, number, number];
  ridge: [number, number, number];
  water: [number, number, number];
  waterSurface: [number, number, number];
  foam: [number, number, number];
  empty: [number, number, number];
}

const colors: TermColors = {
  bottle: [91, 158, 196],   // #5b9ec4
  cap: [45, 90, 122],       // #2d5a7a
  highlight: [142, 200, 232], // #8ec8e8
  ridge: [74, 138, 176],    // #4a8ab0
  water: [21, 101, 160],    // #1565a0
  waterSurface: [33, 150, 243], // #2196f3
  foam: [100, 181, 246],    // #64b5f6
  empty: [10, 22, 40],      // #0a1628
};

function ansiFg(r: number, g: number, b: number): string {
  return `\x1b[38;2;${r};${g};${b}m`;
}
function ansiBg(r: number, g: number, b: number): string {
  return `\x1b[48;2;${r};${g};${b}m`;
}
const RESET = '\x1b[0m';
const HALF_BLOCK = '▄'; // upper half block, fg=top pixel, bg=bottom pixel

function findInteriorRows(): number[] {
  const rows: number[] = [];
  for (let row = 3; row < GRID_ROWS - 1; row++) {
    const baseIdx = row * GRID_COLS;
    const lw = Array.from(BOTTLE_GRID.slice(baseIdx, baseIdx + 8)).lastIndexOf(1);
    const rw = Array.from(BOTTLE_GRID.slice(baseIdx + 8, baseIdx + GRID_COLS)).indexOf(1);
    if (lw >= 0 && rw >= 0 && BOTTLE_GRID[baseIdx + 8 + rw - 1] === 0) rows.push(row);
  }
  return rows;
}

function rowBounds(row: number): { left: number; right: number } | null {
  const baseIdx = row * GRID_COLS;
  let left = -1, right = -1;
  for (let col = 1; col < GRID_COLS; col++)
    if (BOTTLE_GRID[baseIdx + col] === 0 && BOTTLE_GRID[baseIdx + col - 1] === 1) { left = col; break; }
  for (let col = GRID_COLS - 2; col >= 0; col--)
    if (BOTTLE_GRID[baseIdx + col] === 0 && BOTTLE_GRID[baseIdx + col + 1] === 1) { right = col; break; }
  return (left === -1 || right === -1 || left > right) ? null : { left, right };
}

export function renderTerminalBottle(waterMl: number, capacityMl: number): string {
  const interior = findInteriorRows();
  const waterFrac = Math.min(waterMl / capacityMl, 1);
  const filledRows = waterMl > 0 ? Math.max(1, Math.floor(interior.length * waterFrac)) : 0;
  const filledSet = new Set<number>();
  for (let i = interior.length - 1; i >= interior.length - filledRows; i--) {
    filledSet.add(interior[i]);
  }

  let output = '';

  // Render in pairs of rows (top row = fg, bottom row = bg) using half-block
  for (let rowPair = 0; rowPair < GRID_ROWS; rowPair += 2) {
    output += '   '; // indent
    const topRow = rowPair;
    const botRow = rowPair + 1;

    for (let col = 0; col < GRID_COLS; col++) {
      const topIdx = topRow * GRID_COLS + col;
      const botIdx = botRow * GRID_COLS + col;

      const topCell = BOTTLE_GRID[topIdx];
      const botCell = BOTTLE_GRID[botIdx];

      let fg = colors.empty;
      let bg = colors.empty;

      // Top pixel
      if (topCell === 1) {
        if (topRow <= 2) fg = colors.cap;
        else if (topRow === 14 || topRow === 18 || topRow === 21) fg = colors.ridge;
        else if (col <= 3) fg = colors.highlight;
        else fg = colors.bottle;
      } else if (filledSet.has(topRow)) {
        const rfb = interior.length - 1 - interior.indexOf(topRow);
        fg = rfb <= 2 ? colors.waterSurface : colors.water;
      }

      // Bottom pixel
      if (botCell === 1) {
        if (botRow <= 2) bg = colors.cap;
        else if (botRow === 14 || botRow === 18 || botRow === 21) bg = colors.ridge;
        else if (col <= 3) bg = colors.highlight;
        else bg = colors.bottle;
      } else if (filledSet.has(botRow)) {
        const rfb = interior.length - 1 - interior.indexOf(botRow);
        bg = rfb <= 2 ? colors.waterSurface : colors.water;
      }

      output += ansiFg(...fg) + ansiBg(...bg) + HALF_BLOCK;
    }

    output += RESET + '\n';
  }

  // Counter
  const vol = waterMl >= 1000
    ? `${(waterMl / 1000).toFixed(1)} L`
    : `${waterMl.toFixed(1)} ml`;
  output += `   💧 ${vol}  |  localhost:4872\n`;

  return output;
}

// Animation driver — outputs to stderr so it doesn't interfere with MCP stdio
let animFrame = 0;
let currentWater = 0;

export function updateTerminalBottle(waterMl: number, capacityMl = 1000): void {
  currentWater += (waterMl - currentWater) * 0.3;
  if (Math.abs(currentWater - waterMl) < 0.5) currentWater = waterMl;

  // Clear previous bottle (move cursor up enough lines)
  const rows = Math.ceil(GRID_ROWS / 2) + 2; // bottle rows + counter + blank
  process.stderr.write(`\x1b[${rows}A\x1b[J`); // up N + clear below

  const bottle = renderTerminalBottle(currentWater, capacityMl);
  process.stderr.write(bottle);
  animFrame++;
}

export function clearTerminalBottle(): void {
  const rows = Math.ceil(GRID_ROWS / 2) + 2;
  process.stderr.write(`\x1b[J`); // clear below
}
