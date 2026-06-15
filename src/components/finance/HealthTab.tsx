'use client'

import { calcFireNumber, calcRunwayMonths, calcFireProgress } from '@/lib/financialHealthUtils'

interface HealthTabProps {
  monthlySubCost: number
  apptMonthly: number
  maintMonthly: number
  portfolioTotal: number
  netWorthAssets: number
}

function fmt(n: number): string {
  return new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

function fmtDecimal(n: number): string {
  return new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n)
}

export default function HealthTab({ monthlySubCost, apptMonthly, maintMonthly, portfolioTotal, netWorthAssets }: HealthTabProps) {
  const totalMonthlyBurn = monthlySubCost + apptMonthly + maintMonthly
  const fireNumber       = calcFireNumber(totalMonthlyBurn)
  const runwayMonths     = calcRunwayMonths(netWorthAssets, totalMonthlyBurn)
  const fireProgress     = calcFireProgress(portfolioTotal, fireNumber)

  const runwayLabel = runwayMonths === Infinity
    ? '∞'
    : runwayMonths >= 24
    ? `${(runwayMonths / 12).toFixed(1)} yrs`
    : `${Math.round(runwayMonths)} mo`

  const burnBreakdown = [
    { label: 'Subscriptions', value: monthlySubCost, color: 'bg-blue-500' },
    { label: 'Appointments (avg)', value: apptMonthly, color: 'bg-yellow-500' },
    { label: 'Maintenance (avg)', value: maintMonthly, color: 'bg-orange-500' },
  ].filter(b => b.value > 0)

  return (
    <div className="max-w-2xl space-y-6">

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Monthly burn</h2>
        <div className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          {fmtDecimal(totalMonthlyBurn)}<span className="text-base font-normal text-gray-400">/mo</span>
        </div>
        <div className="space-y-2">
          {burnBreakdown.map(b => (
            <div key={b.label} className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${b.color}`} />
              <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">{b.label}</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{fmtDecimal(b.value)}/mo</span>
            </div>
          ))}
        </div>
        {burnBreakdown.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-400">
            Appointments and maintenance based on 12-month trailing average.
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Runway</h2>
        <p className="text-xs text-gray-400 mb-4">How long liquid assets last at current burn</p>
        <div className="text-3xl font-bold text-gray-900 dark:text-white">{runwayLabel}</div>
        <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {fmt(netWorthAssets)} assets ÷ {fmtDecimal(totalMonthlyBurn)}/mo
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">FIRE number</h2>
        <p className="text-xs text-gray-400 mb-4">25× annual spend (4% withdrawal rule)</p>
        <div className="flex items-end gap-4 mb-4">
          <div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">{fmt(fireNumber)}</div>
            <div className="text-xs text-gray-400 mt-0.5">{fmt(portfolioTotal)} invested ({fireProgress.toFixed(1)}%)</div>
          </div>
        </div>
        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
          <div
            className="h-3 rounded-full transition-all duration-500"
            style={{
              width: `${fireProgress}%`,
              backgroundColor: fireProgress >= 100 ? '#10b981' : fireProgress >= 50 ? '#3b82f6' : '#f59e0b',
            }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>0</span>
          <span>{fmt(fireNumber)}</span>
        </div>
        {totalMonthlyBurn === 0 && (
          <p className="text-xs text-gray-400 mt-3">Add subscriptions or cost data to calculate FIRE number.</p>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Annual summary</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-gray-400">Annual spend</div>
            <div className="text-xl font-semibold text-gray-900 dark:text-white">{fmt(totalMonthlyBurn * 12)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Savings needed for FIRE</div>
            <div className="text-xl font-semibold text-gray-900 dark:text-white">{fmt(Math.max(0, fireNumber - portfolioTotal))}</div>
          </div>
        </div>
      </div>

    </div>
  )
}
