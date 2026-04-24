import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button, Input, CodeInput } from '@/components/ui'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'

type Step = 'email' | 'password' | 'verify'

export function Login() {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const titles: Record<Step, string> = {
    email: 'Iniciá sesión para continuar',
    password: 'Ingresá tu contraseña',
    verify: 'Verificación en dos pasos',
  }
  const subtitles: Record<Step, string> = {
    email: 'Accedé a tu experiencia de aprendizaje',
    password: email,
    verify: `Enviamos un código a ${email}`,
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault()
    if (!email.includes('@')) { setError('Ingresá un correo válido'); return }
    setError('')
    setLoading(true)
    try {
      await authApi.sendLoginEmail(email)
      setStep('password')
    } finally { setLoading(false) }
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 4) { setError('Contraseña incorrecta'); return }
    setError('')
    setLoading(true)
    try {
      await authApi.verifyPassword(email, password)
      setStep('verify')
    } finally { setLoading(false) }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (code.length < 4) { setError('Código inválido'); return }
    setError('')
    setLoading(true)
    try {
      const user = await authApi.verify2FA(email, code)
      login(user)
      navigate('/')
    } finally { setLoading(false) }
  }

  return (
    <AuthLayout title={titles[step]} subtitle={subtitles[step]}>
      {step === 'email' && (
        <form onSubmit={handleEmail} className="flex flex-col gap-4">
          <Input
            label="Correo electrónico"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tunombre@ejemplo.com"
            error={error}
            autoFocus
          />
          <Button variant="primary" fullWidth size="lg" type="submit" disabled={loading}>
            {loading ? 'Verificando…' : 'Continuar'}
          </Button>
          <Divider />
          <p className="text-sm text-slate-500 text-center">
            ¿No tenés cuenta?{' '}
            <span
              onClick={() => navigate('/register')}
              className="text-primary font-bold cursor-pointer underline"
            >
              Registrate
            </span>
          </p>
        </form>
      )}

      {step === 'password' && (
        <form onSubmit={handlePassword} className="flex flex-col gap-4">
          <div className="bg-primary-light rounded-[10px] px-4 py-2.5 flex items-center gap-2.5">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" fill="#7c3aed" />
              <path d="M5.5 8a2.5 2.5 0 1 0 5 0 2.5 2.5 0 0 0-5 0z" fill="#fff" />
            </svg>
            <span className="text-[13px] text-primary font-medium flex-1">{email}</span>
            <span
              onClick={() => { setStep('email'); setError('') }}
              className="text-xs text-slate-400 cursor-pointer hover:text-slate-600"
            >
              Cambiar
            </span>
          </div>
          <Input
            label="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            error={error}
            autoFocus
          />
          <div className="text-right">
            <span className="text-[13px] text-primary cursor-pointer font-medium hover:underline">
              ¿Olvidaste tu contraseña?
            </span>
          </div>
          <Button variant="primary" fullWidth size="lg" type="submit" disabled={loading}>
            {loading ? 'Verificando…' : 'Iniciar sesión'}
          </Button>
        </form>
      )}

      {step === 'verify' && (
        <form onSubmit={handleVerify} className="flex flex-col gap-4">
          <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl p-4 text-center">
            <p className="text-[13px] text-[#166534] leading-relaxed">
              Por tu seguridad, enviamos un código de 6 dígitos a tu correo.
              Revisá también tu carpeta de spam.
            </p>
          </div>
          <CodeInput value={code} onChange={setCode} error={error} />
          <Button variant="primary" fullWidth size="lg" type="submit" disabled={loading}>
            {loading ? 'Verificando…' : 'Verificar código'}
          </Button>
          <p className="text-[13px] text-slate-500 text-center">
            ¿No recibiste el código?{' '}
            <span className="text-primary font-semibold cursor-pointer hover:underline">
              Reenviar
            </span>
          </p>
        </form>
      )}
    </AuthLayout>
  )
}

function Divider() {
  return (
    <div className="flex items-center gap-3 my-1">
      <div className="flex-1 h-px bg-[#e2d9f7]" />
      <span className="text-xs text-slate-400">o</span>
      <div className="flex-1 h-px bg-[#e2d9f7]" />
    </div>
  )
}
