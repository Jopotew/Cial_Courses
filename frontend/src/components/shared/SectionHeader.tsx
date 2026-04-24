interface SectionHeaderProps {
  title: string
  subtitle?: string
}

export function SectionHeader({ title, subtitle }: SectionHeaderProps) {
  return (
    <div>
      <h2 className="text-[clamp(22px,3vw,32px)] font-extrabold text-ink tracking-tight mb-2">
        {title}
      </h2>
      {subtitle && <p className="text-[15px] text-slate-500">{subtitle}</p>}
    </div>
  )
}