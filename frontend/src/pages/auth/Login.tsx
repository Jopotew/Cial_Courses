import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button, Input, CodeInput } from '@/components/ui'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'

type Step = 'credentials' | 'verify'

export function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuthStore()
  const [step, setStep] = useState<Step>('credentials')
  const justVerified = (location.state as { verified?: boolean } | null)?.verified === true
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [userId, setUserId] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const titles: Record<Step, string> = {
    credentials: 'Iniciá sesión para continuar',
    verify: 'Verificación en dos pasos',
  }
  const subtitles: Record<Step, string> = {
    credentials: 'Accedé a tu experiencia de aprendizaje',
    verify: `Enviamos un código a ${email}`,
  }

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault()
    if (!email.includes('@')) { setError('Ingresá un correo válido'); return }
    if (password.length < 4) { setError('Contraseña incorrecta'); return }
    setError('')
    setLoading(true)
    try {
      const res = await authApi.login(email, password)
      localStorage.setItem('access_token', res.access_token)
      if (!res.requires_2fa) {
        const user = await authApi.me()
        login(user)
        navigate('/')
      } else {
        setUserId(res.user_id)
        setStep('verify')
      }
    } catch {
      setError('Credenciales incorrectas')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (code.length < 4) { setError('Código inválido'); return }
    setError('')
    setLoading(true)
    try {
      const user = await authApi.verify2FA(userId, code)
      login(user)
      navigate('/')
    } catch {
      setError('Código incorrecto o expirado')
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    try {
      await authApi.resendVerification(email)
    } catch { /* silent */ }
  }

  return (
    <AuthLayout title={titles[step]} subtitle={subtitles[step]}>
      {justVerified && (
        <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl p-4 text-center mb-2">
          <p className="text-[13px] text-[#166534] font-medium">
            ¡Cuenta verificada! Ya podés iniciar sesión.
          </p>
        </div>
      )}

      {step === 'credentials' && (
        <form onSubmit={handleCredentials} className="flex flex-col gap-4">
          <Input
            label="Correo electrónico"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tunombre@ejemplo.com"
            autoFocus
          />
          <Input
            label="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            error={error}
          />
          <div className="text-right">
            <span className="text-[13px] text-primary cursor-pointer font-medium hover:underline">
              ¿Olvidaste tu contraseña?
            </span>
          </div>
          <Button variant="primary" fullWidth size="lg" type="submit" disabled={loading}>
            {loading ? 'Verificando…' : 'Iniciar sesión'}
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
            <span
              onClick={handleResend}
              className="text-primary font-semibold cursor-pointer hover:underline"
            >
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
