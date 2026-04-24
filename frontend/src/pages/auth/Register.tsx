import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button, Input } from '@/components/ui'
import { authApi } from '@/api/auth'

interface RegisterForm {
  name: string
  email: string
  password: string
  confirm: string
}

export function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState<RegisterForm>({ name: '', email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState<Partial<RegisterForm>>({})
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  function set(k: keyof RegisterForm) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }))
  }

  function validate(): Partial<RegisterForm> {
    const e: Partial<RegisterForm> = {}
    if (!form.name.trim()) e.name = 'Ingresá tu nombre'
    if (!form.email.includes('@')) e.email = 'Correo inválido'
    if (form.password.length < 8) e.password = 'Mínimo 8 caracteres'
    if (form.password !== form.confirm) e.confirm = 'Las contraseñas no coinciden'
    return e
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setLoading(true)
    try {
      await authApi.register(form.name, form.email, form.password)
      setDone(true)
    } finally { setLoading(false) }
  }

  if (done) {
    return (
      <AuthLayout title="¡Revisá tu correo!" subtitle={`Enviamos un enlace de verificación a ${form.email}`}>
        <div className="text-center flex flex-col gap-5 items-center">
          <div className="w-[72px] h-[72px] rounded-full bg-accent-light flex items-center justify-center">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <path d="M8 18l7 7 13-14" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="text-sm text-slate-500 leading-relaxed">
            Una vez verificado, podés iniciar sesión y comenzar tu aprendizaje.
          </p>
          <Button variant="primary" fullWidth onClick={() => navigate('/login')}>
            Ir al inicio de sesión
          </Button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Creá tu cuenta" subtitle="Accedé a todos los cursos de CIAL">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <Input
          label="Nombre completo"
          value={form.name}
          onChange={set('name')}
          placeholder="Dr. Juan Pérez"
          error={errors.name}
          autoFocus
        />
        <Input
          label="Correo electrónico"
          type="email"
          value={form.email}
          onChange={set('email')}
          placeholder="tucorreo@ejemplo.com"
          error={errors.email}
        />
        <Input
          label="Contraseña"
          type="password"
          value={form.password}
          onChange={set('password')}
          placeholder="Mínimo 8 caracteres"
          error={errors.password}
        />
        <Input
          label="Confirmá contraseña"
          type="password"
          value={form.confirm}
          onChange={set('confirm')}
          placeholder="Repetí tu contraseña"
          error={errors.confirm}
        />
        <Button variant="primary" fullWidth size="lg" type="submit" disabled={loading}>
          {loading ? 'Creando cuenta…' : 'Crear cuenta'}
        </Button>
        <p className="text-sm text-slate-500 text-center">
          ¿Ya tenés cuenta?{' '}
          <span
            onClick={() => navigate('/login')}
            className="text-primary font-bold cursor-pointer underline"
          >
            Iniciá sesión
          </span>
        </p>
        <p className="text-[11px] text-slate-400 text-center leading-relaxed">
          Al registrarte aceptás nuestros{' '}
          <span className="text-primary cursor-pointer">Términos y condiciones</span> y nuestra{' '}
          <span className="text-primary cursor-pointer">Política de privacidad</span>.
        </p>
      </form>
    </AuthLayout>
  )
}
