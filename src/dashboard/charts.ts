export interface ChartSlice {
  label: string;
  value: number;
  color: string;
}

export function renderPixelDonut(
  ctx: CanvasRenderingContext2D,
  slices: ChartSlice[],
  centerX: number,
  centerY: number,
  outerRadius: number,
  innerRadius: number,
  blockSize: number = 8,
): void {
  if (slices.length === 0) return;

  const total = slices.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return;

  const gridSize = Math.ceil((outerRadius * 2) / blockSize);
  const startX = centerX - outerRadius;
  const startY = centerY - outerRadius;

  let cumulativeAngle = -Math.PI / 2;

  const sliceAngles = slices.map((s) => {
    const angleSpan = (s.value / total) * Math.PI * 2;
    const start = cumulativeAngle;
    cumulativeAngle += angleSpan;
    return { ...s, startAngle: start, endAngle: cumulativeAngle };
  });

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const cx = startX + col * blockSize + blockSize / 2;
      const cy = startY + row * blockSize + blockSize / 2;
      const dist = Math.sqrt((cx - centerX) ** 2 + (cy - centerY) ** 2);

      if (dist > outerRadius || dist < innerRadius) continue;

      const angle = Math.atan2(cy - centerY, cx - centerX);
      const normalized = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const fromPositiveX = (normalized + Math.PI / 2) % (Math.PI * 2);

      for (const slice of sliceAngles) {
        const sa = ((slice.startAngle + Math.PI / 2) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        const ea = ((slice.endAngle + Math.PI / 2) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);

        let inSlice = false;
        if (sa <= ea) {
          inSlice = fromPositiveX >= sa && fromPositiveX < ea;
        } else {
          inSlice = fromPositiveX >= sa || fromPositiveX < ea;
        }

        if (inSlice) {
          ctx.fillStyle = slice.color;
          ctx.fillRect(startX + col * blockSize, startY + row * blockSize, blockSize, blockSize);
          break;
        }
      }
    }
  }
}
