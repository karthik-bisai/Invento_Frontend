export interface CurrencyInfo {
  code: string
  name: string
  symbol: string
  locale: string
}

export const SUPPORTED_CURRENCIES: CurrencyInfo[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$', locale: 'en-US' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', locale: 'en-IN' },
  { code: 'EUR', name: 'Euro', symbol: '€', locale: 'de-DE' },
  { code: 'GBP', name: 'British Pound', symbol: '£', locale: 'en-GB' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'AED', locale: 'en-AE' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'SAR', locale: 'en-SA' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$', locale: 'en-CA' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', locale: 'en-AU' },
]

export const CURRENCY_MAP: Record<string, CurrencyInfo> = Object.fromEntries(
  SUPPORTED_CURRENCIES.map((c) => [c.code, c])
)

export function getCurrencyInfo(code?: string | null): CurrencyInfo {
  if (!code) return CURRENCY_MAP.USD
  return CURRENCY_MAP[code.toUpperCase()] ?? { code: code.toUpperCase(), name: code.toUpperCase(), symbol: code.toUpperCase(), locale: 'en-US' }
}

let appCurrency = 'USD'

export function getAppCurrency(): string {
  return appCurrency
}

export function setAppCurrency(code?: string | null): void {
  if (code && typeof code === 'string') {
    appCurrency = code.toUpperCase()
  } else {
    appCurrency = 'USD'
  }
}

const formatters = new Map<string, Intl.NumberFormat>()

export function formatMoney(amount: number | string | null | undefined, currencyCode?: string): string {
  const num = typeof amount === 'number' ? amount : Number(amount ?? 0)
  if (isNaN(num)) return '-'
  const code = (currencyCode || appCurrency || 'USD').toUpperCase()
  let formatter = formatters.get(code)
  if (!formatter) {
    const info = getCurrencyInfo(code)
    try {
      formatter = new Intl.NumberFormat(info.locale, {
        style: 'currency',
        currency: code,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    } catch {
      formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    }
    formatters.set(code, formatter)
  }
  return formatter.format(num)
}
