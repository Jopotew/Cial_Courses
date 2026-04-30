// Auth pages: Login, Register, Verify2FA

const { useState: useAuthState } = React;

function AuthLayout({ children, title, subtitle }) {
  return (
    <div style={{
      minHeight: 'calc(100vh - 64px)', display: 'grid',
      gridTemplateColumns: 'clamp(280px,45%,520px) 1fr',
      background: '#faf9ff',
    }} className="auth-grid">
      {/* Left – illustration */}
      <div style={{
        background: 'linear-gradient(160deg, #7c3aed 0%, #5b21b6 100%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '60px 48px', gap: 32,
      }} className="auth-left">
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: -1 }}>
            CIAL<span style={{ color: '#6ee7b7' }}>cursos</span>
          </div>
          <div style={{ fontSize: 15, color: 'rgba(255,255,255,.7)', marginTop: 8, lineHeight: 1.5 }}>
            Formación continua para profesionales de la salud bucal
          </div>
        </div>
        <AuthIllustration />
        <div style={{ display: 'flex', gap: 32, textAlign: 'center' }}>
          {[['44+', 'Cursos'], ['3.200+', 'Estudiantes'], ['18', 'Instructores']].map(([n, l]) => (
            <div key={l}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{n}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right – form */}
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px',
      }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1a1a2e', margin: '0 0 8px', lineHeight: 1.2, textAlign: 'center' }}>{title}</h1>
          {subtitle && <p style={{ fontSize: 15, color: '#64748b', textAlign: 'center', margin: '0 0 32px', lineHeight: 1.5 }}>{subtitle}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Login Page ────────────────────────────────────────────
function LoginPage({ onNavigate, onLogin }) {
  const [step, setStep] = useAuthState('email'); // email | password | verify
  const [email, setEmail] = useAuthState('');
  const [password, setPassword] = useAuthState('');
  const [code, setCode] = useAuthState('');
  const [error, setError] = useAuthState('');
  const [loading, setLoading] = useAuthState(false);

  function handleEmail(e) {
    e.preventDefault();
    if (!email.includes('@')) { setError('Ingresá un correo válido'); return; }
    setError('');
    setStep('password');
  }

  function handlePassword(e) {
    e.preventDefault();
    if (password.length < 4) { setError('Contraseña incorrecta'); return; }
    setError('');
    setLoading(true);
    setTimeout(() => { setLoading(false); setStep('verify'); }, 900);
  }

  function handleVerify(e) {
    e.preventDefault();
    if (code.length < 4) { setError('Código inválido'); return; }
    setError('');
    setLoading(true);
    setTimeout(() => { setLoading(false); onLogin(); }, 800);
  }

  const titles = {
    email: 'Iniciá sesión para continuar',
    password: 'Ingresá tu contraseña',
    verify: 'Verificación en dos pasos',
  };
  const subtitles = {
    email: 'Accedé a tu experiencia de aprendizaje',
    password: email,
    verify: `Enviamos un código a ${email}`,
  };

  return (
    <AuthLayout title={titles[step]} subtitle={subtitles[step]}>
      {step === 'email' && (
        <form onSubmit={handleEmail} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input label="Correo electrónico" type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="tunombre@ejemplo.com" error={error} autoFocus />
          <Btn variant="primary" fullWidth size="lg" onClick={handleEmail}>Continuar</Btn>
          <Divider />
          <div style={{ textAlign: 'center', fontSize: 14, color: '#64748b' }}>
            ¿No tenés cuenta?{' '}
            <span onClick={() => onNavigate('register')} style={{ color: '#7c3aed', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>Registrate</span>
          </div>
        </form>
      )}

      {step === 'password' && (
        <form onSubmit={handlePassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#f5f3ff', borderRadius: 10, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" fill="#7c3aed"/><path d="M5.5 8a2.5 2.5 0 1 0 5 0 2.5 2.5 0 0 0-5 0z" fill="#fff"/></svg>
            <span style={{ fontSize: 13, color: '#7c3aed', fontWeight: 500 }}>{email}</span>
            <span onClick={() => { setStep('email'); setError(''); }} style={{ marginLeft: 'auto', fontSize: 12, color: '#94a3b8', cursor: 'pointer' }}>Cambiar</span>
          </div>
          <Input label="Contraseña" type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="••••••••" error={error} autoFocus />
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: 13, color: '#7c3aed', cursor: 'pointer', fontWeight: 500 }}>¿Olvidaste tu contraseña?</span>
          </div>
          <Btn variant="primary" fullWidth size="lg" onClick={handlePassword} disabled={loading}>
            {loading ? 'Verificando…' : 'Iniciar sesión'}
          </Btn>
        </form>
      )}

      {step === 'verify' && (
        <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: '#166534', lineHeight: 1.5 }}>
              Por tu seguridad, enviamos un código de 6 dígitos a tu correo. Revisá también tu carpeta de spam.
            </div>
          </div>
          <CodeInput value={code} onChange={setCode} error={error} />
          <Btn variant="primary" fullWidth size="lg" onClick={handleVerify} disabled={loading}>
            {loading ? 'Verificando…' : 'Verificar código'}
          </Btn>
          <div style={{ textAlign: 'center', fontSize: 13, color: '#64748b' }}>
            ¿No recibiste el código?{' '}
            <span style={{ color: '#7c3aed', fontWeight: 600, cursor: 'pointer' }}>Reenviar</span>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}

// ── Code Input (6 boxes) ──────────────────────────────────
function CodeInput({ value, onChange, error }) {
  const inputs = React.useRef([]);
  const digits = value.split('').concat(Array(6).fill('')).slice(0, 6);

  function handleKey(i, e) {
    if (e.key === 'Backspace') {
      const next = digits.map((d, j) => j === i ? '' : d).join('');
      onChange(next);
      if (i > 0) inputs.current[i - 1]?.focus();
    } else if (/^\d$/.test(e.key)) {
      const next = digits.map((d, j) => j === i ? e.key : d).join('');
      onChange(next);
      if (i < 5) inputs.current[i + 1]?.focus();
    }
    e.preventDefault();
  }

  return (
    <div>
      <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 10 }}>Código de verificación</label>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        {digits.map((d, i) => (
          <input key={i} ref={el => inputs.current[i] = el}
            value={d} onKeyDown={e => handleKey(i, e)} readOnly
            autoFocus={i === 0}
            style={{
              width: 52, height: 60, textAlign: 'center', fontSize: 24, fontWeight: 700,
              border: `2px solid ${error && !d ? '#ef4444' : d ? '#7c3aed' : '#e2d9f7'}`,
              borderRadius: 12, outline: 'none', fontFamily: 'inherit', color: '#1a1a2e',
              background: d ? '#f5f3ff' : '#fff',
            }}
          />
        ))}
      </div>
      {error && <div style={{ fontSize: 12, color: '#ef4444', textAlign: 'center', marginTop: 8 }}>{error}</div>}
    </div>
  );
}

// ── Register Page ─────────────────────────────────────────
function RegisterPage({ onNavigate, onLogin }) {
  const [form, setForm] = useAuthState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useAuthState({});
  const [loading, setLoading] = useAuthState(false);
  const [done, setDone] = useAuthState(false);

  function set(k) { return e => setForm(f => ({ ...f, [k]: e.target.value })); }

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = 'Ingresá tu nombre';
    if (!form.email.includes('@')) e.email = 'Correo inválido';
    if (form.password.length < 8) e.password = 'Mínimo 8 caracteres';
    if (form.password !== form.confirm) e.confirm = 'Las contraseñas no coinciden';
    return e;
  }

  function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setLoading(true);
    setTimeout(() => { setLoading(false); setDone(true); }, 1000);
  }

  if (done) return (
    <AuthLayout title="¡Revisá tu correo!" subtitle={`Enviamos un enlace de verificación a ${form.email}`}>
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none"><path d="M8 18l7 7 13-14" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>Una vez verificado, podés iniciar sesión y comenzar tu aprendizaje.</p>
        <Btn variant="primary" fullWidth onClick={() => onNavigate('login')}>Ir al inicio de sesión</Btn>
      </div>
    </AuthLayout>
  );

  return (
    <AuthLayout title="Creá tu cuenta" subtitle="Accedé a todos los cursos de CIAL">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Input label="Nombre completo" value={form.name} onChange={set('name')} placeholder="Dr. Juan Pérez" error={errors.name} autoFocus />
        <Input label="Correo electrónico" type="email" value={form.email} onChange={set('email')} placeholder="tucorreo@ejemplo.com" error={errors.email} />
        <Input label="Contraseña" type="password" value={form.password} onChange={set('password')} placeholder="Mínimo 8 caracteres" error={errors.password} />
        <Input label="Confirmá contraseña" type="password" value={form.confirm} onChange={set('confirm')} placeholder="Repetí tu contraseña" error={errors.confirm} />
        <Btn variant="primary" fullWidth size="lg" onClick={handleSubmit} disabled={loading}>{loading ? 'Creando cuenta…' : 'Crear cuenta'}</Btn>
        <div style={{ textAlign: 'center', fontSize: 14, color: '#64748b' }}>
          ¿Ya tenés cuenta?{' '}
          <span onClick={() => onNavigate('login')} style={{ color: '#7c3aed', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>Iniciá sesión</span>
        </div>
        <p style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', lineHeight: 1.5 }}>
          Al registrarte aceptás nuestros <span style={{ color: '#7c3aed', cursor: 'pointer' }}>Términos y condiciones</span> y nuestra <span style={{ color: '#7c3aed', cursor: 'pointer' }}>Política de privacidad</span>.
        </p>
      </div>
    </AuthLayout>
  );
}

function Divider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
      <div style={{ flex: 1, height: 1, background: '#e2d9f7' }}></div>
      <span style={{ fontSize: 12, color: '#94a3b8' }}>o</span>
      <div style={{ flex: 1, height: 1, background: '#e2d9f7' }}></div>
    </div>
  );
}

Object.assign(window, { LoginPage, RegisterPage });
