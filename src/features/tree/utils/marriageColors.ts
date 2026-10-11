export const MARRIAGE_COLORS = [
  "#38bdf8", // 1. Sky blue (Hôn nhân 1 / Vợ Cả)
  "#f43f5e", // 2. Rose (Hôn nhân 2 / Bà Hai)
  "#a855f7", // 3. Purple (Hôn nhân 3 / Bà Ba)
  "#f59e0b", // 4. Amber (Hôn nhân 4 / Bà Tư)
  "#10b981", // 5. Emerald (Hôn nhân 5 / Bà Năm)
];

export function getMarriageColor(order: number = 1): string {
  const normalizedOrder = Math.max(1, order || 1);
  const index = (normalizedOrder - 1) % MARRIAGE_COLORS.length;
  return MARRIAGE_COLORS[index];
}
