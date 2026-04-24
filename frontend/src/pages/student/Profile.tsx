import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { Button, Input } from '@/components/ui'
import { getInitials } from '@/lib/utils'

type Tab = 'personal' | 'password' | 'preferences'

export function Profile() {
  const { user, login } = useAuthStore()
  const [tab, setTab] = useState<Tab>('personal')
  const [form, setForm] = useState({ name: user?.name ?? '', email: user?.email ?? '' })
  const [passForm, setPassForm] = useState({ current: '', next: '', confirm: '' })
  const [saved, setSaved] = useState(false)
  const [passError, setPassError] = useState('')
  const [passSaved, setPassSaved] = useState(false)

  function setF(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }))
  }
  function setP(k: keyof typeof passForm) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setPassForm((f) => ({ ...f, [k]: e.target.value }))
  }

  function handleSavePersonal() {
    if (!form.name.trim() || !form.email.includes('@')) return
    if (user) {
      login({ ...user, name: form.name, email: form.email, initials: getInitials(form.name) })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }
  }

  function handleSavePassword() {
    setPassError('')
    if (passForm.current.length < 4) { setPassError('Contraseña actual incorrecta'); return }
    if (passForm.next.length < 8) { setPassError('La nueva contraseña debe tener al menos 8 caracteres'); return }
    if (passForm.next !== passForm.confirm) { setPassError('Las contraseñas no coinciden'); return }
    setPassSaved(true)
    setPassForm({ current: '', next: '', confirm: '' })
    setTimeout(() => setPassSaved(false), 2500)
  }

  return (
    <div className="min-h-screen bg-canvas">
      {/* Header */}
      <div
        className="px-6"
        style={{
          background: 'linear-gradient(135deg, #1e0a3c, #3b1a7a)',
          padding: 'clamp(32px,5vw,52px) 24px',
        }}
      >
        <div className="max-w-[800px] mx-auto">
          <div className="flex items-center gap-5">
            <div className="w-[72px] h-[72px] rounded-full bg-avatar-grad flex items-center justify-center text-[26px] font-extrabold text-white flex-shrink-0">
              {user?.initials}
            </div>
            <div>
              <h1
                className="font-black text-white tracking-tight mb-1"
                style={{ fontSize: 'clamp(20px,3vw,28px)' }}
              >
                {user?.name}
              </h1>
              <p className="text-sm text-white/60">{user?.email}</p>
              {user?.isAdmin && (
                <span className="inline-block mt-2 bg-primary/50 text-primary-muted text-[11px] font-bold px-[10px] py-[3px] rounded-full tracking-[.5px]">
                  ADMINISTRADOR
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-[#f0ebfd]">
        <div className="max-w-[800px] mx-auto px-6 flex gap-1">
          {([['personal', 'Datos personales'], ['password', 'Contraseña'], ['preferences', 'Preferencias']] as [Tab, string][]).map(
            ([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className="px-5 py-4 border-none bg-transparent font-sans text-sm cursor-pointer transition-all whitespace-nowrap"
                style={{
                  borderBottom: tab === id ? '2px solid #7c3aed' : '2px solid transparent',
                  color: tab === id ? '#7c3aed' : '#64748b',
                  fontWeight: tab === id ? 700 : 500,
                }}
              >
                {label}
              </button>
            ),
          )}
        </div>
      </div>

      <div className="max-w-[800px] mx-auto px-6 py-8">
        {tab === 'personal' && (
          <div className="bg-white rounded-[20px] border border-[#f0ebfd] px-8 py-7">
            <h2 className="text-lg font-extrabold text-ink mb-6">Datos personales</h2>
            <div className="flex flex-col gap-[18px]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Nombre completo" value={form.name} onChange={setF('name')} placeholder="Tu nombre" />
                <Input label="Correo electrónico" type="email" value={form.email} onChange={setF('email')} placeholder="tucorreo@ejemplo.com" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Profesión" value="Odontólogo/a" onChange={() => {}} placeholder="Ej: Odontólogo" />
                <Input label="País" value="Argentina" onChange={() => {}} placeholder="Tu país" />
              </div>
              <div className="flex items-center gap-3.5 mt-2 flex-wrap">
                <Button variant="primary" onClick={handleSavePersonal}>Guardar cambios</Button>
                {saved && <SavedFeedback label="¡Guardado correctamente!" />}
              </div>
            </div>
          </div>
        )}

        {tab === 'password' && (
          <div className="bg-white rounded-[20px] border border-[#f0ebfd] px-8 py-7">
            <h2 className="text-lg font-extrabold text-ink mb-2">Cambiar contraseña</h2>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              Usá una contraseña segura con al menos 8 caracteres, letras y números.
            </p>
            <div className="flex flex-col gap-4 max-w-[420px]">
              <Input label="Contraseña actual" type="password" value={passForm.current} onChange={setP('current')} placeholder="••••••••" />
              <Input label="Nueva contraseña" type="password" value={passForm.next} onChange={setP('next')} placeholder="Mínimo 8 caracteres" />
              <Input label="Confirmá la nueva contraseña" type="password" value={passForm.confirm} onChange={setP('confirm')} placeholder="Repetí la contraseña" />
              {passError && (
                <div className="bg-red-50 border border-red-200 rounded-[10px] px-3.5 py-2.5 text-[13px] text-red-500">
                  {passError}
                </div>
              )}
              <div className="flex items-center gap-3.5 mt-1 flex-wrap">
                <Button variant="primary" onClick={handleSavePassword}>Cambiar contraseña</Button>
                {passSaved && <SavedFeedback label="¡Contraseña actualizada!" />}
              </div>
            </div>
          </div>
        )}

        {tab === 'preferences' && (
          <div className="bg-white rounded-[20px] border border-[#f0ebfd] px-8 py-7">
            <h2 className="text-lg font-extrabold text-ink mb-6">Preferencias</h2>
            <div>
              <PrefRow label="Notificaciones por email" sub="Recibir novedades y recordatorios de cursos" defaultChecked />
              <PrefRow label="Emails de progreso" sub="Resumen semanal de tu avance" defaultChecked />
              <PrefRow label="Novedades de CIAL" sub="Nuevos cursos y descuentos exclusivos" defaultChecked={false} />
            </div>
            <div className="mt-7 pt-6 border-t border-[#f0ebfd]">
              <p className="text-sm font-bold text-ink mb-4">Zona de peligro</p>
              <div className="bg-red-50 border border-red-200 rounded-[14px] px-[22px] py-[18px] flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p className="text-sm font-bold text-ink mb-1">Eliminar cuenta</p>
                  <p className="text-[13px] text-slate-500">Esta acción es permanente y no se puede deshacer.</p>
                </div>
                <button className="text-sm text-red-500 border-[1.5px] border-red-200 bg-transparent rounded-[10px] px-4 py-2 cursor-pointer font-semibold hover:bg-red-50 transition-colors">
                  Eliminar cuenta
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function SavedFeedback({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-accent font-semibold">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="7" fill="#d1fae5" />
        <path d="M5 8l2 2 4-4" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      {label}
    </div>
  )
}

function PrefRow({ label, sub, defaultChecked }: { label: string; sub: string; defaultChecked: boolean }) {
  const [checked, setChecked] = useState(defaultChecked)
  return (
    <div className="flex items-center justify-between py-[18px] border-b border-[#f0ebfd] gap-5">
      <div>
        <p className="text-sm font-semibold text-ink mb-[3px]">{label}</p>
        <p className="text-[13px] text-slate-500">{sub}</p>
      </div>
      <label className="relative w-11 h-6 flex-shrink-0 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="opacity-0 w-0 h-0 absolute"
        />
        <span
          className="absolute inset-0 rounded-full transition-colors duration-200"
          style={{ background: checked ? '#7c3aed' : '#e2d9f7' }}
        />
        <span
          className="absolute w-[18px] h-[18px] bg-white rounded-full shadow-[0_1px_4px_rgba(0,0,0,.2)] transition-all duration-200"
          style={{ top: 3, left: checked ? 23 : 3 }}
        />
      </label>
    </div>
  )
}
