// Catalog and Course Detail pages

const { useState: useCatState, useMemo: useCatMemo } = React;

// ── Catalog ───────────────────────────────────────────────
function CatalogPage({ onNavigate, params = {}, user }) {
  const { data } = window.CIAL;
  const [search, setSearch] = useCatState(params.search || '');
  const [activeCat, setActiveCat] = useCatState(params.categoryId || null);
  const [level, setLevel] = useCatState('');
  const [onlyFree, setOnlyFree] = useCatState(false);
  const [sort, setSort] = useCatState('rating');

  const filtered = useCatMemo(() => {
    let list = data.courses;
    if (activeCat) list = list.filter(c => c.categoryId === activeCat);
    if (level) list = list.filter(c => c.level === level);
    if (onlyFree) list = list.filter(c => c.free);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c => c.title.toLowerCase().includes(q) || c.category.toLowerCase().includes(q) || c.instructor.toLowerCase().includes(q));
    }
    if (sort === 'rating') list = [...list].sort((a, b) => b.rating - a.rating);
    if (sort === 'students') list = [...list].sort((a, b) => b.students - a.students);
    if (sort === 'price_asc') list = [...list].sort((a, b) => a.price - b.price);
    if (sort === 'price_desc') list = [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [activeCat, level, onlyFree, search, sort]);

  return (
    <div style={{ minHeight: '100vh', background: '#faf9ff' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#1e0a3c,#3b1a7a)', padding: 'clamp(32px,5vw,56px) 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h1 style={{ fontSize: 'clamp(24px,4vw,40px)', fontWeight: 900, color: '#fff', margin: '0 0 16px', letterSpacing: -0.5 }}>Catálogo de cursos</h1>
          <div style={{ display: 'flex', background: '#fff', borderRadius: 12, overflow: 'hidden', maxWidth: 520, boxShadow: '0 4px 20px rgba(0,0,0,.2)' }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cursos…"
              style={{ flex: 1, padding: '13px 18px', border: 'none', outline: 'none', fontSize: 15, fontFamily: 'inherit', color: '#1a1a2e' }}/>
            <button onClick={() => {}} style={{ background: '#7c3aed', border: 'none', padding: '0 20px', cursor: 'pointer' }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><circle cx="8" cy="8" r="5"/><path d="m12 12 3.5 3.5"/></svg>
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px', display: 'grid', gridTemplateColumns: 'clamp(200px,22%,260px) 1fr', gap: 32, alignItems: 'start' }} className="catalog-grid">
        {/* Sidebar */}
        <aside>
          <FilterBlock title="Categoría">
            <FilterChip label="Todas" active={!activeCat} onClick={() => setActiveCat(null)} />
            {data.categories.map(cat => (
              <FilterChip key={cat.id} label={cat.name} count={cat.count} active={activeCat === cat.id} onClick={() => setActiveCat(activeCat === cat.id ? null : cat.id)} color={cat.color}/>
            ))}
          </FilterBlock>
          <FilterBlock title="Nivel">
            <FilterChip label="Todos" active={!level} onClick={() => setLevel('')} />
            {['Básico','Intermedio','Avanzado'].map(l => (
              <FilterChip key={l} label={l} active={level === l} onClick={() => setLevel(level === l ? '' : l)} />
            ))}
          </FilterBlock>

        </aside>

        {/* Results */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <span style={{ fontSize: 14, color: '#64748b' }}><b style={{ color: '#1a1a2e' }}>{filtered.length}</b> cursos encontrados</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 13, color: '#64748b' }}>Ordenar por:</span>
              <select value={sort} onChange={e => setSort(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e2d9f7', fontSize: 13, fontFamily: 'inherit', color: '#374151', outline: 'none', cursor: 'pointer', background: '#fff' }}>
                <option value="rating">Mejor calificación</option>
                <option value="students">Más populares</option>
                <option value="price_asc">Precio: menor a mayor</option>
                <option value="price_desc">Precio: mayor a menor</option>
              </select>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>—</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#374151', marginBottom: 8 }}>No encontramos cursos</div>
              <div style={{ fontSize: 14 }}>Probá con otro término o eliminá los filtros</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 20 }}>
              {filtered.map(c => (
                <CourseCard key={c.id} course={c} onNavigate={onNavigate} enrolled={data.enrolledIds.includes(c.id) && !!user} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterBlock({ title, children }) {
  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', marginBottom: 16, border: '1px solid #f0ebfd' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>
    </div>
  );
}

function FilterChip({ label, active, onClick, count, color }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: active ? '#f5f3ff' : 'transparent', color: active ? '#7c3aed' : '#374151',
      border: active ? '1.5px solid #c4b5fd' : '1.5px solid transparent',
      borderRadius: 8, padding: '8px 12px', fontFamily: 'inherit', fontSize: 14,
      fontWeight: active ? 700 : 400, cursor: 'pointer', textAlign: 'left', transition: 'all .15s',
    }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {color && active && <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }}/>}
        {label}
      </span>
      {count && <span style={{ fontSize: 12, color: '#94a3b8' }}>{count}</span>}
    </button>
  );
}

// ── Course Detail ─────────────────────────────────────────
function CourseDetailPage({ onNavigate, params = {}, user }) {
  const { data } = window.CIAL;
  const course = data.courses.find(c => c.id === params.courseId) || data.courses[0];
  const cat = data.categories.find(c => c.id === course.categoryId) || {};
  const isEnrolled = data.enrolledIds.includes(course.id) && !!user;
  const progress = isEnrolled ? (data.progress[course.id] || 0) : 0;
  const [openModule, setOpenModule] = useCatState(null);
  const [purchasing, setPurchasing] = useCatState(false);
  const [purchased, setPurchased] = useCatState(false);

  // Build flat lesson list to find resume point
  const allLessons = [];
  course.modules.forEach((mod, mi) => {
    for (let li = 0; li < mod.lessons; li++) allLessons.push({ moduleIndex: mi, lessonIndex: li });
  });
  const completedCount = Math.floor((progress / 100) * allLessons.length);
  const resumeIdx = Math.min(completedCount, allLessons.length - 1);

  function handleBuy() {
    if (!user) { onNavigate('login'); return; }
    setPurchasing(true);
    setTimeout(() => {
      setPurchasing(false);
      setPurchased(true);
      data.enrolledIds.push(course.id);
      data.progress[course.id] = 0;
    }, 1400);
  }

  function handlePlay(lessonIdx) {
    onNavigate('player', { courseId: course.id, lessonIdx: lessonIdx ?? resumeIdx });
  }

  const discount = course.originalPrice > course.price
    ? Math.round((1 - course.price / course.originalPrice) * 100) : 0;

  const enrolled = isEnrolled || purchased;

  return (
    <div style={{ minHeight: '100vh', background: '#faf9ff' }}>
      {/* Hero — changes when enrolled */}
      <div style={{ background: enrolled ? `linear-gradient(135deg,#0f0520,${course.cardColor}44,#0f0520)` : 'linear-gradient(135deg,#1e0a3c,#3b1a7a)', padding: 'clamp(32px,5vw,56px) 24px', position: 'relative', overflow: 'hidden' }}>
        {enrolled && (
          <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 70% 50%, ${course.cardColor}22, transparent 60%)`, pointerEvents: 'none' }}/>
        )}
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr clamp(280px,36%,380px)', gap: 40, alignItems: 'start', position: 'relative' }} className="detail-hero">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <span onClick={() => onNavigate('catalog')} style={{ fontSize: 13, color: 'rgba(255,255,255,.6)', cursor: 'pointer' }}>Cursos</span>
              <span style={{ color: 'rgba(255,255,255,.3)' }}>/</span>
              <span onClick={() => onNavigate('catalog', { categoryId: course.categoryId })} style={{ fontSize: 13, color: 'rgba(255,255,255,.6)', cursor: 'pointer' }}>{course.category}</span>
            </div>

            {/* Enrolled badge */}
            {enrolled
              ? <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(5,150,105,.2)', border: '1px solid rgba(5,150,105,.4)', borderRadius: 99, padding: '4px 12px', marginBottom: 12 }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5.5" fill="#059669"/><path d="M3.5 6l2 2 3-3" stroke="#fff" strokeWidth="1.3" strokeLinecap="round"/></svg>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#6ee7b7' }}>Inscripto</span>
                </div>
              : <Badge variant="green">{course.free ? 'Gratis' : course.level}</Badge>
            }

            <h1 style={{ fontSize: 'clamp(22px,3.5vw,36px)', fontWeight: 900, color: '#fff', margin: '12px 0 10px', lineHeight: 1.15, letterSpacing: -0.5 }}>{course.title}</h1>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,.75)', lineHeight: 1.6, margin: '0 0 20px' }}>{course.subtitle}</p>

            {/* Progress bar when enrolled */}
            {enrolled && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,.6)' }}>{completedCount} de {allLessons.length} clases completadas</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: progress >= 80 ? '#6ee7b7' : '#a78bfa' }}>{progress}%</span>
                </div>
                <div style={{ height: 7, background: 'rgba(255,255,255,.12)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${progress}%`, background: progress >= 80 ? 'linear-gradient(90deg,#059669,#34d399)' : `linear-gradient(90deg,${course.cardColor},#a78bfa)`, borderRadius: 99, transition: 'width .6s ease' }}/>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: `linear-gradient(135deg,${course.cardColor},${course.cardColor}99)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>{course.instructorInitials}</div>
                <div>
                  <div style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>{course.instructor}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.55)' }}>{course.instructorTitle}</div>
                </div>
              </div>
              <span style={{ color: 'rgba(255,255,255,.3)' }}>|</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#fbbf24' }}>{course.rating}</span>
                <StarRating rating={course.rating} small />
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,.55)' }}>({course.reviewCount} reseñas)</span>
              </div>
              <span style={{ color: 'rgba(255,255,255,.3)' }}>|</span>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,.6)' }}>{course.students.toLocaleString('es-AR')} estudiantes</span>
            </div>

            {/* Enrolled CTA inline on mobile */}
            {enrolled && (
              <div style={{ marginTop: 24, display: 'none' }} className="detail-enrolled-mobile">
                <Btn variant="primary" size="lg" onClick={() => handlePlay()}>
                  ▶ {progress > 0 ? 'Continuar curso' : 'Comenzar curso'}
                </Btn>
              </div>
            )}
          </div>

          {/* Right card */}
          {enrolled
            ? <EnrolledCard course={course} progress={progress} completedCount={completedCount} totalLessons={allLessons.length} onPlay={handlePlay} onNavigate={onNavigate} resumeIdx={resumeIdx} />
            : <PurchaseCard course={course} discount={discount} isEnrolled={false} purchased={purchased} purchasing={purchasing} onBuy={handleBuy} onNavigate={onNavigate} user={user} />
          }
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px', display: 'grid', gridTemplateColumns: '1fr clamp(280px,36%,380px)', gap: 40, alignItems: 'start' }} className="detail-body">
        <div>
          {/* Resources section — only for enrolled */}
          {enrolled && course.resources && course.resources.length > 0 && (
            <Section title="Recursos descargables">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {course.resources.map(res => {
                  const extColors = { PDF: ['#fee2e2','#ef4444'], DOC: ['#dbeafe','#2563eb'], DOCX: ['#dbeafe','#2563eb'], PPT: ['#ffedd5','#ea580c'], PPTX: ['#ffedd5','#ea580c'], XLS: ['#dcfce7','#16a34a'], XLSX: ['#dcfce7','#16a34a'] };
                  const [bg, fg] = extColors[res.ext] || ['#f1f5f9','#64748b'];
                  return (
                    <a key={res.id} href={res.fakeUrl || '#'} download onClick={e => e.preventDefault()}
                      style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#faf9ff', border: '1.5px solid #f0ebfd', borderRadius: 14, padding: '14px 18px', textDecoration: 'none', transition: 'all .18s', cursor: 'pointer' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#c4b5fd'; e.currentTarget.style.background = '#f5f3ff'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#f0ebfd'; e.currentTarget.style.background = '#faf9ff'; }}>
                      {/* Icon */}
                      <div style={{ width: 42, height: 42, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: fg, letterSpacing: -.3 }}>{res.ext}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{res.name}</div>
                        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Documento del curso</div>
                      </div>
                      {/* Download icon */}
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M8 3v7M5 7l3 3 3-3"/><path d="M3 13h10"/>
                        </svg>
                      </div>
                    </a>
                  );
                })}
              </div>
            </Section>
          )}

          <Section title="Sobre este curso">
            <p style={{ fontSize: 15, color: '#374151', lineHeight: 1.7 }}>{course.description}</p>
            <div style={{ display: 'flex', gap: 20, marginTop: 20, flexWrap: 'wrap' }}>
              {[
                [`${course.lessons} clases`, 'Clases en video'],
                [course.duration, 'Duración total'],
                [course.level, 'Nivel'],
              ].map(([v, l]) => (
                <div key={l} style={{ textAlign: 'center', flex: 1, minWidth: 100, background: '#f5f3ff', borderRadius: 12, padding: '14px 10px' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#7c3aed' }}>{v}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{l}</div>
                </div>
              ))}
            </div>
          </Section>

          {/* Curriculum — clickable rows when enrolled */}
          <Section title={`Contenido del curso · ${course.lessons} clases · ${course.duration}`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {course.modules.map((mod, mi) => {
                const modStart = allLessons.findIndex(l => l.moduleIndex === mi);
                return (
                  <div key={mi} style={{ border: `1.5px solid ${openModule === mi ? '#c4b5fd' : '#e2d9f7'}`, borderRadius: 12, overflow: 'hidden' }}>
                    <button onClick={() => setOpenModule(openModule === mi ? null : mi)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: openModule === mi ? '#f5f3ff' : '#fff', border: 'none', cursor: 'pointer', fontFamily: 'inherit', transition: 'background .15s' }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e', textAlign: 'left' }}>{mod.title}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>{mod.lessons} clases · {mod.duration}</span>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" style={{ transform: openModule === mi ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}><path d="M4 6l4 4 4-4"/></svg>
                      </div>
                    </button>
                    {openModule === mi && (
                      <div style={{ background: '#faf9ff', borderTop: '1px solid #f0ebfd' }}>
                        {Array.from({ length: Math.min(mod.lessons, 5) }).map((_, j) => {
                          const globalIdx = modStart + j;
                          const done = globalIdx < completedCount;
                          const isLocked = !enrolled && !(mi === 0 && j === 0 && course.free);
                          return (
                            <div key={j}
                              onClick={() => enrolled ? handlePlay(globalIdx) : null}
                              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', borderBottom: j < Math.min(mod.lessons, 5) - 1 ? '1px solid #f0ebfd' : 'none', cursor: enrolled ? 'pointer' : 'default', transition: 'background .15s' }}
                              onMouseEnter={e => enrolled && (e.currentTarget.style.background = '#f5f3ff')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                              {/* Lesson icon */}
                              <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: done ? '#d1fae5' : isLocked ? '#f1f5f9' : '#ede9fe' }}>
                                {done
                                  ? <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2.5 6.5l3 3 5-5.5" stroke="#059669" strokeWidth="1.5" strokeLinecap="round"/></svg>
                                  : isLocked
                                    ? <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="2" y="5" width="8" height="6" rx="1.5" fill="#94a3b8"/><path d="M4 5V3.5a2 2 0 014 0V5" stroke="#94a3b8" strokeWidth="1.3"/></svg>
                                    : <svg width="12" height="12" viewBox="0 0 12 12" fill="#7c3aed"><path d="M3 2l7 4-7 4V2z"/></svg>
                                }
                              </div>
                              <span style={{ fontSize: 13, color: isLocked ? '#94a3b8' : '#374151', flex: 1 }}>
                                Clase {j + 1}: {mod.title} — parte {j + 1}
                              </span>
                              {mi === 0 && j === 0 && course.free && !enrolled && (
                                <span style={{ fontSize: 11, color: '#059669', fontWeight: 600, flexShrink: 0 }}>Vista previa</span>
                              )}
                              {enrolled && (
                                <span style={{ fontSize: 11, color: '#7c3aed', fontWeight: 600, flexShrink: 0, opacity: 0.7 }}>▶ Ver</span>
                              )}
                            </div>
                          );
                        })}
                        {mod.lessons > 5 && <div style={{ fontSize: 12, color: '#94a3b8', padding: '10px 18px' }}>+ {mod.lessons - 5} clases más</div>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>
        </div>

        <div className="detail-card-desktop">
          {enrolled
            ? <EnrolledCard course={course} progress={progress} completedCount={completedCount} totalLessons={allLessons.length} onPlay={handlePlay} onNavigate={onNavigate} resumeIdx={resumeIdx} sticky />
            : <PurchaseCard course={course} discount={discount} isEnrolled={false} purchased={purchased} purchasing={purchasing} onBuy={handleBuy} onNavigate={onNavigate} user={user} sticky />
          }
        </div>
      </div>
    </div>
  );
}

// ── Enrolled card ─────────────────────────────────────────
function EnrolledCard({ course, progress, completedCount, totalLessons, onPlay, onNavigate, resumeIdx, sticky }) {
  return (
    <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,.12)', position: sticky ? 'sticky' : 'relative', top: sticky ? 80 : undefined, border: `2px solid ${course.cardColor}33` }}>
      {/* Banner */}
      <div style={{ height: 130, background: `linear-gradient(135deg,${course.cardColor}ee,${course.cardColor}77)`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', cursor: 'pointer' }} onClick={() => onPlay()}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M6 4l16 8-16 8V4z"/></svg>
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.85)', fontWeight: 600 }}>
            {progress === 100 ? '¡Curso completado!' : progress > 0 ? 'Continuar donde dejaste' : 'Comenzar curso'}
          </div>
        </div>
        <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(255,255,255,.95)', borderRadius: 99, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="5" fill="#059669"/><path d="M2.5 5l2 2 3-3" stroke="#fff" strokeWidth="1.2" strokeLinecap="round"/></svg>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#059669' }}>Inscripto</span>
        </div>
      </div>

      <div style={{ padding: '20px 22px' }}>
        {/* Progress */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: '#374151', fontWeight: 600 }}>Tu progreso</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: progress >= 80 ? '#059669' : '#7c3aed' }}>{progress}%</span>
          </div>
          <div style={{ height: 8, background: '#f0ebfd', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: progress >= 80 ? 'linear-gradient(90deg,#059669,#34d399)' : `linear-gradient(90deg,${course.cardColor},#a78bfa)`, borderRadius: 99, transition: 'width .6s ease' }}/>
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>{completedCount} de {totalLessons} clases completadas</div>
        </div>

        {/* Main CTA */}
        <Btn variant="primary" fullWidth size="lg" onClick={() => onPlay()}>
          {progress === 100 ? '▶ Repasar curso' : progress > 0 ? '▶ Continuar curso' : '▶ Comenzar curso'}
        </Btn>

        {progress === 100 && (
          <div style={{ marginTop: 12, background: '#d1fae5', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" fill="#059669"/><path d="M6 10l3 3 5-6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/></svg>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#059669' }}>¡Curso completado!</div>
              <div style={{ fontSize: 12, color: '#166534' }}>Ya podés descargar tu certificado</div>
            </div>
          </div>
        )}

        {/* Quick stats */}
        <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid #f0ebfd', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            [course.duration, 'Duración total'],
            [`${course.lessons} clases`, 'Lecciones'],
            [course.level, 'Nivel'],
            ['Certificado', 'Al completar'],
          ].map(([v, l]) => (
            <div key={l} style={{ textAlign: 'center', background: '#faf9ff', borderRadius: 10, padding: '10px 8px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e' }}>{v}</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>

        <Btn variant="ghost" fullWidth size="sm" style={{ marginTop: 10 }} onClick={() => onNavigate('dashboard')}>
          Ver en Mi aprendizaje
        </Btn>
      </div>
    </div>
  );
}

function PurchaseCard({ course, discount, isEnrolled, purchased, purchasing, onBuy, onNavigate, user, sticky }) {
  return (
    <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,.15)', position: sticky ? 'sticky' : 'relative', top: sticky ? 80 : undefined }}>
      {/* Thumbnail placeholder */}
      <div style={{ height: 140, background: `linear-gradient(135deg,${course.cardColor}dd,${course.cardColor}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(255,255,255,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: '#fff' }}>{course.instructorInitials}</div>
      </div>
      <div style={{ padding: '20px 22px' }}>
        {purchased || isEnrolled ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M6 14l6 6 10-12" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#059669', marginBottom: 16 }}>¡Ya estás inscripto!</div>
            <Btn variant="primary" fullWidth size="lg" onClick={() => onNavigate('dashboard')}>Ir a mi aprendizaje</Btn>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: 30, fontWeight: 900, color: course.free ? '#059669' : '#1a1a2e' }}>{formatPrice(course.price)}</span>
              {!course.free && course.originalPrice > course.price && (
                <span style={{ fontSize: 16, color: '#94a3b8', textDecoration: 'line-through' }}>{formatPrice(course.originalPrice)}</span>
              )}
            </div>
            {discount > 0 && <div style={{ fontSize: 13, color: '#ef4444', fontWeight: 600, marginBottom: 16 }}>{discount}% de descuento</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
              <Btn variant="primary" fullWidth size="lg" onClick={onBuy} disabled={purchasing}>
                {purchasing ? 'Procesando…' : course.free ? 'Inscribirse gratis' : 'Comprar ahora'}
              </Btn>
            </div>
            {!course.free && <p style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 12, lineHeight: 1.4 }}>Pago seguro a través de MercadoPago. Acceso ilimitado sin vencimiento.</p>}
          </>
        )}
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #f0ebfd' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 10 }}>Este curso incluye:</div>
          {[
            [`${course.duration} de video`, '▶'],
            [`${course.lessons} clases`, '◉'],
            ['Acceso de por vida', '∞'],
            ['Certificado de finalización', '✦'],
          ].map(([t, ic]) => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#374151', marginBottom: 8 }}>
              <span style={{ color: '#7c3aed', fontSize: 14 }}>{ic}</span>{t}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ background: '#fff', borderRadius: 20, padding: '24px 28px', marginBottom: 20, border: '1px solid #f0ebfd' }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1a1a2e', margin: '0 0 18px', letterSpacing: -0.3 }}>{title}</h2>
      {children}
    </div>
  );
}

Object.assign(window, { CatalogPage, CourseDetailPage });
