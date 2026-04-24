import type { SelectHTMLAttributes, ReactNode } from 'react'

interface FormSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  children: ReactNode
}

export function FormSelect({ label, children, ...props }: FormSelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-[13px] font-semibold text-gray-700">{label}</label>
      )}
      <select
        className="px-4 py-3 rounded-[10px] border-[1.5px] border-[#e2d9f7] text-sm font-sans text-ink bg-white outline-none cursor-pointer transition-colors focus:border-primary"
        {...props}
      >
        {children}
      </select>
    </div>
  )
}