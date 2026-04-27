import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button, Input, CodeInput } from '@/components/ui'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'

interface RegisterForm {
  name: string
  username: string
  email: string
  password: string
  confirm: string
}

type Step = 'form' | 'verify'

export function Register() {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [step, setStep] = useState<Step>('form')
  const [form, setForm] = useState<RegisterForm>({ name: '', username: '', email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState<Partial<RegisterForm>>({})
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState('')
  const [loading, setLoading] = useState(false)

  function set(k: keyof RegisterForm) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }))
  }

  function validate(): Partial<RegisterForm> {
    const e: Partial<RegisterForm> = {}
    if (!form.name.trim()) e.name = 'Ingresá tu nombre'
    if (!form.username.trim()) e.username = 'Ingresá un nombre de usuario'
    else if (!/^[a-z0-9_]{3,}$/i.test(form.username)) e.username = 'Solo letras, números y _ (mín. 3 caracteres)'
    if (!form.email.includes('@')) e.email = 'Correo inválido'
    if (form.password.length < 8) e.password = 'Mínimo 8 caracteres'
    else if (!/[A-Z]/.test(form.password)) e.password = 'Debe contener al menos una mayúscula'
    else if (!/[a-z]/.test(form.password)) e.password = 'Debe contener al menos una minúscula'
    else if (!/[0-9]/.test(form.password)) e.password = 'Debe contener al menos un número'
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
      await authApi.register(form.name, form.username, form.email, form.password)
      setStep('verify')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      if (msg?.includes('username')) setErrors({ username: 'Este nombre de usuario ya está en uso' })
      else if (msg?.includes('email')) setErrors({ email: 'Este correo ya está registrado' })
      else setErrors({ email: 'Error al crear la cuenta. Intentá de nuevo.' })
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (code.length !== 6) { setCodeError('Ingresá los 6 dígitos del código'); return }
    setCodeError('')
    setLoading(true)
    try {
      await authApi.verifyEmail(form.email, code)
      navigate('/login', { state: { verified: true } })
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number; data?: { detail?: string } } })?.response?.status
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      if (status === 404) setCodeError('Email no encontrado')
      else if (status === 400) setCodeError(detail ?? 'Código incorrecto o expirado')
      else if (status === 422) setCodeError('Código inválido — revisá que sean 6 dígitos')
      else setCodeError('Error al verificar. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    try {
      await authApi.resendVerification(form.email)
    } catch { /* silent */ }
  }

  if (step === 'verify') {
    return (
      <AuthLayout title="Verificá tu correo" subtitle={`Enviamos un código de 6 dígitos a ${form.email}`}>
        <form onSubmit={handleVerify} className="flex flex-col gap-4">
          <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl p-4 text-center">
            <p className="text-[13px] text-[#166534] leading-relaxed">
              Ingresá el código para activar tu cuenta.
              Revisá también tu carpeta de spam.
            </p>
          </div>
          <CodeInput value={code} onChange={setCode} error={codeError} />
          <Button variant="primary" fullWidth size="lg" type="submit" disabled={loading}>
            {loading ? 'Verificando…' : 'Activar cuenta'}
          </Button>
          <p className="text-[13px] text-slate-500 text-center">
            ¿No recibiste el código?{' '}
            <span
              onClick={handleResend}
              className="text-primary font-semibold cursor-pointer hover:underline"
            >
              Reenviar
            </span>
          </p>
        </form>
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
          label="Nombre de usuario"
          value={form.username}
          onChange={set('username')}
          placeholder="drjuanperez"
          error={errors.username}
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
