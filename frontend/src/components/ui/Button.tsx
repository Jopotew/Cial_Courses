import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  fullWidth?: boolean
  children: ReactNode
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-primary text-white hover:bg-primary-dark hover:shadow-primary-hover active:scale-[.98]',
  secondary:
    'bg-accent-lighter text-accent hover:bg-accent-light',
  outline:
    'bg-transparent text-primary border-[1.5px] border-primary hover:bg-primary-light',
  ghost:
    'bg-transparent text-primary hover:bg-primary-light',
  danger:
    'bg-red-500 text-white hover:bg-red-600',
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-4 py-2 text-[13px]',
  md: 'px-[22px] py-[11px] text-sm',
  lg: 'px-7 py-[14px] text-base',
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-semibold rounded-[10px] border-none',
        'transition-all duration-[180ms] cursor-pointer select-none',
        'disabled:opacity-60 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}