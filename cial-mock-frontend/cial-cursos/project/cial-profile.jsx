// User Profile page

const { useState: useProfileState } = React;

function ProfilePage({ user, onUserUpdate, onNavigate }) {
  const [tab, setTab] = useProfileState('personal');
  const [form, setForm] = useProfileState({ name: user.name, email: user.email });
  const [passForm, setPassForm] = useProfileState({ current: '', next: '', confirm: '' });
  const [saved, setSaved] = useProfileState(false);
  const [passError, setPassError] = useProfileState('');
  const [passSaved, setPassSaved] = useProfileState(false);

  function setF(k) { return e => setForm(f => ({ ...f, [k]: e.target.value })); }
  function setP(k) { return e => setPassForm(f => ({ ...f, [k]: e.target.value })); }

  function handleSavePersonal() {
    if (!form.name.trim() || !form.email.includes('@')) return;
    onUserUpdate({ ...user, name: form.name, email: form.email, initials: form.name.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function handleSavePassword() {
    setPassError('');
    if (passForm.current.length < 4) { setPassError('Contraseña actual incorrecta'); return; }
    if (passForm.next.length < 8) { setPassError('La nueva contraseña debe tener al menos 8 caracteres'); return; }
    if (passForm.next !== passForm.confirm) { setPassError('Las contraseñas no coinciden'); return; }
    setPassSaved(true);
    setPassForm({ current: '', next: '', confirm: '' });
    setTimeout(() => setPassSaved(false), 2500);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#faf9ff' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#1e0a3c,#3b1a7a)', padding: 'clamp(32px,5vw,52px) 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{user.initials}</div>
            <div>
              <h1 style={{ fontSize: 'clamp(20px,3vw,28px)', fontWeight: 900, color: '#fff', margin: '0 0 4px', letterSpacing: -.5 }}>{user.name}</h1>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,.6)' }}>{user.email}</div>
              {user.isAdmin && (
                <span style={{ display: 'inline-block', marginTop: 8, background: 'rgba(124,58,237,.5)', color: '#c4b5fd', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, letterSpacing: .5 }}>ADMINISTRADOR</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: '#fff', borderBottom: '1px solid #f0ebfd' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px', display: 'flex', gap: 4 }}>
          {[['personal','Datos personales'],['password','Contraseña'],['preferences','Preferencias']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              style={{ padding: '16px 20px', border: 'none', borderBottom: tab === id ? '2px solid #7c3aed' : '2px solid transparent', background: 'transparent', color: tab === id ? '#7c3aed' : '#64748b', fontFamily: 'inherit', fontSize: 14, fontWeight: tab === id ? 700 : 500, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all .15s' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
        {/* Personal data */}
        {tab === 'personal' && (
          <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #f0ebfd', padding: '28px 32px' }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1a1a2e', margin: '0 0 24px' }}>Datos personales</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="profile-grid">
                <Input label="Nombre completo" value={form.name} onChange={setF('name')} placeholder="Tu nombre" />
                <Input label="Correo electrónico" type="email" value={form.email} onChange={setF('email')} placeholder="tucorreo@ejemplo.com" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="profile-grid">
                <Input label="Profesión" value="Odontólogo/a" onChange={() => {}} placeholder="Ej: Odontólogo" />
                <Input label="País" value="Argentina" onChange={() => {}} placeholder="Tu país" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 8, flexWrap: 'wrap' }}>
                <Btn variant="primary" onClick={handleSavePersonal}>Guardar cambios</Btn>
                {saved && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#059669', fontWeight: 600 }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" fill="#d1fae5"/><path d="M5 8l2 2 4-4" stroke="#059669" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    ¡Guardado correctamente!
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Password */}
        {tab === 'password' && (
          <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #f0ebfd', padding: '28px 32px' }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1a1a2e', margin: '0 0 8px' }}>Cambiar contraseña</h2>
            <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 24px', lineHeight: 1.5 }}>Usá una contraseña segura con al menos 8 caracteres, letras y números.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 420 }}>
              <Input label="Contraseña actual" type="password" value={passForm.current} onChange={setP('current')} placeholder="••••••••" />
              <Input label="Nueva contraseña" type="password" value={passForm.next} onChange={setP('next')} placeholder="Mínimo 8 caracteres" />
              <Input label="Confirmá la nueva contraseña" type="password" value={passForm.confirm} onChange={setP('confirm')} placeholder="Repetí la contraseña" />
              {passError && (
                <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#ef4444' }}>{passError}</div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 4 }}>
                <Btn variant="primary" onClick={handleSavePassword}>Cambiar contraseña</Btn>
                {passSaved && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#059669', fontWeight: 600 }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" fill="#d1fae5"/><path d="M5 8l2 2 4-4" stroke="#059669" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    ¡Contraseña actualizada!
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Preferences */}
        {tab === 'preferences' && (
          <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #f0ebfd', padding: '28px 32px' }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1a1a2e', margin: '0 0 24px' }}>Preferencias</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                { label: 'Notificaciones por email', sub: 'Recibir novedades y recordatorios de cursos', checked: true },
                { label: 'Emails de progreso', sub: 'Resumen semanal de tu avance', checked: true },
                { label: 'Novedades de CIAL', sub: 'Nuevos cursos y descuentos exclusivos', checked: false },
              ].map((pref, i) => (
                <PrefRow key={i} {...pref} />
              ))}
            </div>
            <div style={{ marginTop: 28, paddingTop: 24, borderTop: '1px solid #f0ebfd' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', marginBottom: 16 }}>Zona de peligro</div>
              <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 14, padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 }}>Eliminar cuenta</div>
                  <div style={{ fontSize: 13, color: '#64748b' }}>Esta acción es permanente y no se puede deshacer.</div>
                </div>
                <Btn size="sm" style={{ background: 'transparent', color: '#ef4444', border: '1.5px solid #fecaca' }}>Eliminar cuenta</Btn>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PrefRow({ label, sub, checked: defaultChecked }) {
  const [checked, setChecked] = useProfileState(defaultChecked);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 0', borderBottom: '1px solid #f0ebfd', gap: 20 }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e', marginBottom: 3 }}>{label}</div>
        <div style={{ fontSize: 13, color: '#64748b' }}>{sub}</div>
      </div>
      <label style={{ position: 'relative', width: 44, height: 24, flexShrink: 0, cursor: 'pointer', display: 'block' }}>
        <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}/>
        <span style={{ position: 'absolute', inset: 0, background: checked ? '#7c3aed' : '#e2d9f7', borderRadius: 99, transition: '.2s' }}></span>
        <span style={{ position: 'absolute', width: 18, height: 18, background: '#fff', borderRadius: '50%', top: 3, left: checked ? 23 : 3, transition: '.2s', boxShadow: '0 1px 4px rgba(0,0,0,.2)' }}></span>
      </label>
    </div>
  );
}

Object.assign(window, { ProfilePage });
