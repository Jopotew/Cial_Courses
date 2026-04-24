import { useState, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, className, ...props }: InputProps) {
  const [focused, setFocused] = useState(false)

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-[13px] font-semibold text-gray-700">{label}</label>
      )}
      <input
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={cn(
          'px-4 py-3 rounded-[10px] text-[15px] font-sans text-ink bg-white w-full',
          'border-[1.5px] outline-none transition-all duration-150 placeholder:text-slate-400',
          error
            ? 'border-red-400'
            : focused
              ? 'border-primary shadow-[0_0_0_3px_rgba(124,58,237,.1)]'
              : 'border-[#e2d9f7]',
          className,
        )}
        {...props}
      />
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  )
}