import { CircleDollarSign, Euro, IndianRupee, PoundSterling } from 'lucide-react'
import { cn } from '@/lib/cn'
import { getCurrencyInfo } from '@/lib/currency'

export interface CurrencyIconProps {
  currency?: string | null
  className?: string
}

export function CurrencyIcon({ currency, className }: CurrencyIconProps) {
  const code = (currency || 'USD').toUpperCase()
  if (code === 'INR') {
    return <IndianRupee className={cn('size-4', className)} aria-hidden />
  }
  if (code === 'EUR') {
    return <Euro className={cn('size-4', className)} aria-hidden />
  }
  if (code === 'GBP') {
    return <PoundSterling className={cn('size-4', className)} aria-hidden />
  }
  if (code === 'USD') {
    return <CircleDollarSign className={cn('size-4', className)} aria-hidden />
  }
  const info = getCurrencyInfo(code)
  return (
    <span
      className={cn(
        'inline-flex size-4 items-center justify-center text-[10px] font-bold leading-none tracking-tight',
        className
      )}
      aria-hidden
    >
      {info.symbol || code}
    </span>
  )
}
