import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'green' | 'gray' | 'blue'

interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-primary-light text-primary',
  green:   'bg-accent-light text-accent',
  gray:    'bg-slate-100 text-slate-500',
  blue:    'bg-sky-100 text-sky-600',
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-block whitespace-nowrap px-[10px] py-[3px] rounded-full text-xs font-semibold',
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}