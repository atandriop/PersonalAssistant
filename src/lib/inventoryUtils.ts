export interface CategoryForValue {
  valueMethod: string
  depreciationRate: number | null
}

export interface ItemForValue {
  cost: number
  currentValue: number | null | undefined
  purchaseDate: string | null | undefined
}

export function computeValue(item: ItemForValue, category: CategoryForValue): number {
  if (item.currentValue !== null && item.currentValue !== undefined) {
    return item.currentValue
  }
  if (
    category.valueMethod === 'depreciation' &&
    category.depreciationRate !== null &&
    item.purchaseDate
  ) {
    const rate = category.depreciationRate
    const purchased = new Date(item.purchaseDate).getTime()
    // A rate outside [0, 1] makes Math.pow a negative base to a fractional
    // power = NaN, and Math.max(0, NaN) is NaN, which poisons every total that
    // sums these values. Same for an unparseable purchaseDate.
    if (!Number.isFinite(rate) || rate < 0 || rate > 1 || Number.isNaN(purchased)) {
      return item.cost
    }
    const years = (Date.now() - purchased) / (365.25 * 24 * 60 * 60 * 1000)
    return Math.max(0, item.cost * Math.pow(1 - rate, years))
  }
  return item.cost
}
