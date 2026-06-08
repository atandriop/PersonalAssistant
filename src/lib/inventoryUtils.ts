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
    const ms = Date.now() - new Date(item.purchaseDate).getTime()
    const years = ms / (365.25 * 24 * 60 * 60 * 1000)
    return Math.max(0, item.cost * Math.pow(1 - category.depreciationRate, years))
  }
  return item.cost
}
