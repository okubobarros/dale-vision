export type RevenueTier = {
  min: number
  max: number
}

const REVENUE_TIERS: RevenueTier[] = [
  { min: 0, max: 100_000 },
  { min: 100_000, max: 1_000_000 },
  { min: 1_000_000, max: 5_000_000 },
  { min: 5_000_000, max: 10_000_000 },
]

export const formatCurrencyBRL = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(Math.max(0, value))

export const getRevenueTier = (currentRevenue: number): RevenueTier => {
  const safeRevenue = Math.max(0, currentRevenue)
  const tier = REVENUE_TIERS.find((item) => safeRevenue < item.max)
  return tier ?? REVENUE_TIERS[REVENUE_TIERS.length - 1]
}

export const getTierProgress = (currentRevenue: number, tier: RevenueTier): number => {
  const tierRange = Math.max(1, tier.max - tier.min)
  const safeRevenue = Math.max(0, currentRevenue)
  const progress = ((safeRevenue - tier.min) / tierRange) * 100
  return Math.max(0, Math.min(100, progress))
}
