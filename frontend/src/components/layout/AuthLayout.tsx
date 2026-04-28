import type { ReactNode } from 'react'
import { Navbar } from '@/components/layout/Navbar'

interface AuthLayoutProps {
  title: string
  subtitle?: string
  children: ReactNode
}

function AuthIllustration() {
  return (
    <svg viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-[340px]">
      <circle cx="200" cy="200" r="180" fill="#f5f3ff" />
      <circle cx="200" cy="200" r="140" fill="#ede9fe" />
      <rect x="110" y="130" width="180" height="140" rx="12" fill="#fff" stroke="#7c3aed" strokeWidth="2" />
      <rect x="126" y="148" width="148" height="8" rx="4" fill="#ede9fe" />
      <rect x="126" y="164" width="120" height="8" rx="4" fill="#ede9fe" />
      <rect x="126" y="180" width="100" height="8" rx="4" fill="#ede9fe" />
      <rect x="158" y="240" width="84" height="20" rx="4" fill="#7c3aed" />
      <rect x="174" y="244" width="52" height="12" rx="3" fill="#6d28d9" />
      <circle cx="290" cy="130" r="32" fill="#059669" />
      <path d="M290 116l3.6 7.2 8 1.2-5.8 5.6 1.4 8-7.2-3.8-7.2 3.8 1.4-8-5.8-5.6 8-1.2z" fill="#fff" />
      <rect x="80" y="240" width="70" height="14" rx="4" fill="#7c3aed" />
      <rect x="84" y="228" width="62" height="14" rx="4" fill="#a78bfa" />
      <rect x="88" y="216" width="54" height="14" rx="4" fill="#c4b5fd" />
      <circle cx="310" cy="260" r="28" fill="#7c3aed" />
      <path d="M304 252l18 8-18 8V252z" fill="#fff" />
      <circle cx="140" cy="100" r="6" fill="#059669" />
      <circle cx="160" cy="90" r="4" fill="#7c3aed" opacity=".5" />
      <circle cx="260" cy="320" r="8" fill="#7c3aed" opacity=".3" />
      <circle cx="240" cy="336" r="5" fill="#059669" opacity=".5" />
      <circle cx="330" cy="180" r="5" fill="#059669" />
    </svg>
  )
}

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <>
    <Navbar />
    <div className="min-h-[calc(100vh-4rem)] grid auth-grid bg-canvas">
      {/* Left – illustration panel */}
      <div className="bg-auth-side hidden md:flex flex-col items-center justify-center px-12 py-[60px] gap-8">
        <div className="text-center">
          <p className="text-[28px] font-extrabold text-white tracking-tight">
            CIAL<span className="text-accent-bright">cursos</span>
          </p>
          <p className="text-[15px] text-white/70 mt-2 leading-relaxed">
            Formación continua para profesionales de la salud bucal
          </p>
        </div>
        <AuthIllustration />
        <div className="flex gap-8 text-center">
          {([['44+', 'Cursos'], ['3.200+', 'Estudiantes'], ['18', 'Instructores']] as [string, string][]).map(
            ([n, l]) => (
              <div key={l}>
                <p className="text-[22px] font-extrabold text-white">{n}</p>
                <p className="text-xs text-white/60 mt-0.5">{l}</p>
              </div>
            ),
          )}
        </div>
      </div>

      {/* Right – form */}
      <div className="flex flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-[420px]">
          <h1 className="text-[26px] font-extrabold text-ink text-center mb-2 leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[15px] text-slate-500 text-center mb-8 leading-relaxed">
              {subtitle}
            </p>
          )}
          {children}
        </div>
      </div>
    </div>
    </>
  )
}