// All money is stored and transported as integer paise. Never float, never string.
// Conversion to rupees happens at exactly two boundaries: the payment gateway and the UI.

export const toPaise = (rupees: number): number => Math.round(rupees * 100);
export const toRupees = (paise: number): number => paise / 100;

export function formatMoney(paise: number, opts: { compact?: boolean } = {}): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: paise % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
    notation: opts.compact ? 'compact' : 'standard',
  }).format(paise / 100);
}

/** Percentage discount on a paise amount, rounded half-up, clamped to the base. */
export function applyPercent(basePaise: number, percent: number): number {
  return Math.min(Math.round((basePaise * percent) / 100), basePaise);
}
