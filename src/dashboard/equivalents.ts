import type { Equivalent } from '../shared/types';

interface EquivalentDef {
  spriteKey: string;
  label: string;
  divisor: number;
  unit: string;
}

const DEFINITIONS: EquivalentDef[] = [
  { spriteKey: 'bottle', label: 'Water bottles', divisor: 500, unit: 'bottles' },
  { spriteKey: 'cactus', label: 'Cactus rations', divisor: 3300, unit: 'months' },
  { spriteKey: 'ice-bag', label: 'Bags of ice', divisor: 4500, unit: 'bags' },
  { spriteKey: 'tea-cup', label: 'Cups of tea', divisor: 250, unit: 'cups' },
  { spriteKey: 'shower', label: 'Showers', divisor: 60000, unit: 'showers' },
  { spriteKey: 'rain', label: 'Minutes of rainfall', divisor: 500, unit: 'minutes' },
  { spriteKey: 'bathtub', label: 'Bathtubs', divisor: 150000, unit: 'bathtubs' },
  { spriteKey: 'tears', label: 'Titanic rewatches (in tears)', divisor: 50, unit: 'rewatches' },
  { spriteKey: 'plant', label: 'Houseplant waterings', divisor: 200, unit: 'waterings' },
  { spriteKey: 'ramen', label: 'Ramen bowls cooked', divisor: 500, unit: 'bowls' },
  { spriteKey: 'cloud', label: 'Mass of cloud', divisor: 1, unit: 'grams' },
  { spriteKey: 'whale', label: 'Blue whales (by volume)', divisor: 190_000_000, unit: 'whales' },
  { spriteKey: 'pool', label: 'Olympic swimming pools', divisor: 2_500_000_000, unit: 'pools' },
  { spriteKey: 'lake', label: 'Micro-lakes', divisor: 10_000_000, unit: 'lakes' },
  { spriteKey: 'syrup', label: 'Pancakes worth of syrup', divisor: 30, unit: 'pancakes' },
];

export class EquivalentGenerator {
  generate(waterMl: number): Equivalent[] {
    if (waterMl <= 0) return [];

    const qualified: Equivalent[] = [];

    for (const def of DEFINITIONS) {
      const value = waterMl / def.divisor;
      if (value >= 0.01 && value <= 999_999) {
        qualified.push({
          label: def.label,
          value: Math.round(value * 100) / 100,
          spriteKey: def.spriteKey,
          unit: def.unit,
        });
      }
    }

    qualified.sort((a, b) => b.value - a.value);
    return qualified.slice(0, 6);
  }
}
