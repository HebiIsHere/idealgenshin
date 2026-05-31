export function calcLaumaPrayer(em: number, cons: string): number {
  const multipliers: Record<string, number> = { c0: 4.0, c2: 8.0, c3: 8.723 };
  return em * (multipliers[cons] ?? 0);
}
