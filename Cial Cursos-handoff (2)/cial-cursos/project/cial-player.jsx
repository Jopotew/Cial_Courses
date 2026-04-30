// Video Player Page

const { useState: usePlayerState, useEffect: usePlayerEffect, useRef: usePlayerRef } = React;

function PlayerPage({ onNavigate, params = {}, user }) {
  const { data } = window.CIAL;
  const course = data.courses.find(c => c.id === params.courseId) || data.courses[0];
  const progress = data.progress[course.id] || 0;

  // Build flat lesson list from modules
  const allLessons = [];
  course.modules.forEach((mod, mi) => {
    for (let li = 0; li < mod.lessons; li++) {
      allLessons.push({
        id: `${mi}-${li}`,
        moduleIndex: mi,
        lessonIndex: li,
        moduleTitle: mod.title,
        title: `${mod.title} — parte ${li + 1}`,
        duration: '12:00',
        free: mi === 0 && li === 0,
      });
    }
  });

  // Determine which lesson to start from based on progress
  const startIndex = Math.min(
    Math.floor((progress / 100) * allLessons.length),
    allLessons.length - 1
  );

  const [currentIdx, setCurrentIdx] = usePlayerState(params.lessonIdx ?? startIndex);
  const [playing, setPlaying] = usePlayerState(false);
  const [elapsed, setElapsed] = usePlayerState(0);
  const [sidebarOpen, setSidebarOpen] = usePlayerState(false);
  const intervalRef = usePlayerRef(null);
  const totalSeconds = 720; // 12 min per lesson

  const currentLesson = allLessons[currentIdx];
  const completedCount = Math.floor((progress / 100) * allLessons.length);

  // Timer simulation
  usePlayerEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setElapsed(e => {
          if (e >= totalSeconds - 1) {
            setPlaying(false);
            return totalSeconds;
          }
          return e + 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [playing]);

  // Reset when lesson changes
  usePlayerEffect(() => {
    setPlaying(false);
    setElapsed(0);
  }, [currentIdx]);

  function fmt(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  const pct = (elapsed / totalSeconds) * 100;

  function prevLesson() { if (currentIdx > 0) setCurrentIdx(currentIdx - 1); }
  function nextLesson() { if (currentIdx < allLessons.length - 1) setCurrentIdx(currentIdx + 1); }

  return (
    <div style={{ minHeight: '100vh', background: '#0f0520', display: 'flex', flexDirection: 'column' }}>

      {/* Top bar */}
      <div style={{ background: '#1a0a32', borderBottom: '1px solid rgba(255,255,255,.08)', padding: '0 20px', height: 56, display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0, zIndex: 10 }}>
        <button onClick={() => onNavigate('course', { courseId: course.id })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.6)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontFamily: 'inherit', padding: '6px 0' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 4L6 8l4 4"/></svg>
          Volver al curso
        </button>
        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,.12)' }}/>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{course.title}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', marginTop: 1 }}>
            Clase {currentIdx + 1} de {allLessons.length}
          </div>
        </div>
        {/* Progress pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{ width: 80, height: 5, background: 'rgba(255,255,255,.12)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg,#7c3aed,#a78bfa)', borderRadius: 99 }}/>
          </div>
          <span style={{ fontSize: 12, color: '#a78bfa', fontWeight: 700 }}>{progress}%</span>
        </div>
        {/* Mobile sidebar toggle */}
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="player-sidebar-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.6)', padding: 6, display: 'none' }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 5h14M3 10h14M3 15h14"/></svg>
        </button>
      </div>

      {/* Body: video + sidebar */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }} className="player-body">

        {/* Video area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

          {/* Video */}
          <div style={{ background: '#000', position: 'relative', aspectRatio: '16/9', width: '100%', flexShrink: 0 }}>
            {/* Fake video frame */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(160deg, ${course.cardColor}22, #000)` }}>
              {!playing && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,.12)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', cursor: 'pointer', border: '2px solid rgba(255,255,255,.2)', transition: 'all .2s' }}
                    onClick={() => setPlaying(true)}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,.12)'}>
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="white"><path d="M10 6l18 10L10 26V6z"/></svg>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,.8)' }}>{currentLesson.title}</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,.45)', marginTop: 6 }}>{currentLesson.moduleTitle}</div>
                </div>
              )}
              {playing && (
                <div onClick={() => setPlaying(false)} style={{ position: 'absolute', inset: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {/* Animated bars */}
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {[0,1,2,3,4].map(i => (
                      <div key={i} style={{ width: 4, borderRadius: 2, background: course.cardColor + 'aa', animation: `bar${i} .8s ease-in-out infinite alternate`, height: [24,40,32,48,28][i] }}/>
                    ))}
                  </div>
                  <style>{`
                    @keyframes bar0{from{transform:scaleY(.4)}to{transform:scaleY(1)}}
                    @keyframes bar1{from{transform:scaleY(.6)}to{transform:scaleY(.3)}}
                    @keyframes bar2{from{transform:scaleY(1)}to{transform:scaleY(.5)}}
                    @keyframes bar3{from{transform:scaleY(.3)}to{transform:scaleY(.9)}}
                    @keyframes bar4{from{transform:scaleY(.7)}to{transform:scaleY(.2)}}
                  `}</style>
                </div>
              )}
            </div>

            {/* Controls overlay */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,.85))', padding: '32px 20px 16px' }}>
              {/* Progress bar */}
              <div style={{ position: 'relative', height: 4, background: 'rgba(255,255,255,.2)', borderRadius: 99, marginBottom: 12, cursor: 'pointer' }}
                onClick={e => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pct = (e.clientX - rect.left) / rect.width;
                  setElapsed(Math.floor(pct * totalSeconds));
                }}>
                <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg,${course.cardColor},#a78bfa)`, borderRadius: 99, transition: 'width .2s' }}/>
                <div style={{ position: 'absolute', top: '50%', left: `${pct}%`, transform: 'translate(-50%,-50%)', width: 12, height: 12, borderRadius: '50%', background: '#fff', boxShadow: '0 0 6px rgba(0,0,0,.5)' }}/>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {/* Prev */}
                <button onClick={prevLesson} disabled={currentIdx === 0} style={{ background: 'none', border: 'none', cursor: currentIdx === 0 ? 'default' : 'pointer', color: currentIdx === 0 ? 'rgba(255,255,255,.3)' : '#fff', padding: 4 }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M6 4h2v12H6V4zm2 6l8-6v12l-8-6z"/></svg>
                </button>

                {/* Play/Pause */}
                <button onClick={() => setPlaying(!playing)} style={{ background: 'rgba(255,255,255,.15)', border: 'none', cursor: 'pointer', color: '#fff', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                  {playing
                    ? <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="3" y="2" width="4" height="12"/><rect x="9" y="2" width="4" height="12"/></svg>
                    : <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M4 2l12 6-12 6V2z"/></svg>
                  }
                </button>

                {/* Next */}
                <button onClick={nextLesson} disabled={currentIdx === allLessons.length - 1} style={{ background: 'none', border: 'none', cursor: currentIdx === allLessons.length - 1 ? 'default' : 'pointer', color: currentIdx === allLessons.length - 1 ? 'rgba(255,255,255,.3)' : '#fff', padding: 4 }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M14 4h-2v12h2V4zm-2 6L4 4v12l8-6z"/></svg>
                </button>

                {/* Time */}
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,.7)', marginLeft: 4, whiteSpace: 'nowrap' }}>{fmt(elapsed)} / {fmt(totalSeconds)}</span>

                {/* Lesson title */}
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentLesson.title}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Below video: description */}
          <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <Badge variant="default">{currentLesson.moduleTitle}</Badge>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: '10px 0 8px', letterSpacing: -.3 }}>{currentLesson.title}</h2>
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,.55)', lineHeight: 1.6 }}>
                  {course.instructor} · {course.instructorTitle}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
                <button onClick={prevLesson} disabled={currentIdx === 0} style={{ background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.12)', color: currentIdx === 0 ? 'rgba(255,255,255,.25)' : '#fff', borderRadius: 10, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: currentIdx === 0 ? 'default' : 'pointer', fontFamily: 'inherit' }}>← Anterior</button>
                <button onClick={nextLesson} disabled={currentIdx === allLessons.length - 1} style={{ background: currentIdx === allLessons.length - 1 ? 'rgba(124,58,237,.3)' : '#7c3aed', border: 'none', color: '#fff', borderRadius: 10, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: currentIdx === allLessons.length - 1 ? 'default' : 'pointer', fontFamily: 'inherit' }}>Siguiente →</button>
              </div>
            </div>

            {/* Nav pills for modules on mobile */}
            <div className="player-module-pills" style={{ display: 'none', gap: 8, flexWrap: 'wrap', marginTop: 20 }}>
              {course.modules.map((mod, i) => (
                <button key={i} onClick={() => setCurrentIdx(allLessons.findIndex(l => l.moduleIndex === i))}
                  style={{ background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.12)', color: 'rgba(255,255,255,.7)', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {i + 1}. {mod.title.split(' ').slice(0,3).join(' ')}…
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className={`player-sidebar${sidebarOpen ? ' open' : ''}`} style={{ width: 320, background: '#160a2e', borderLeft: '1px solid rgba(255,255,255,.08)', display: 'flex', flexDirection: 'column', flexShrink: 0, overflowY: 'auto' }}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,.08)', flexShrink: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Contenido del curso</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.4)' }}>{completedCount} de {allLessons.length} clases completadas</div>
            {/* Mini progress */}
            <div style={{ height: 4, background: 'rgba(255,255,255,.1)', borderRadius: 99, marginTop: 10, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg,#7c3aed,#059669)', borderRadius: 99 }}/>
            </div>
          </div>

          {/* Lesson list grouped by module */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {course.modules.map((mod, mi) => {
              const modLessons = allLessons.filter(l => l.moduleIndex === mi);
              const modCompleted = modLessons.filter((_, li) => allLessons.indexOf(modLessons[li]) < completedCount).length;
              return (
                <div key={mi}>
                  <div style={{ padding: '14px 20px 10px', background: 'rgba(255,255,255,.04)', borderBottom: '1px solid rgba(255,255,255,.06)', position: 'sticky', top: 0, zIndex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.7)', lineHeight: 1.3 }}>{mod.title}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,.3)', marginTop: 3 }}>{modCompleted}/{mod.lessons} clases · {mod.duration}</div>
                  </div>
                  {modLessons.map((lesson, li) => {
                    const globalIdx = allLessons.indexOf(lesson);
                    const done = globalIdx < completedCount;
                    const active = globalIdx === currentIdx;
                    return (
                      <LessonRow key={lesson.id} lesson={lesson} lessonNumber={li + 1} active={active} done={done} cardColor={course.cardColor} onClick={() => { setCurrentIdx(globalIdx); setSidebarOpen(false); }} />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .player-sidebar { display: none !important; }
          .player-sidebar.open { display: flex !important; position: fixed; top: 56px; right: 0; bottom: 0; z-index: 400; width: min(320px, 90vw) !important; flex-direction: column; }
          .player-sidebar-btn { display: block !important; }
          .player-module-pills { display: flex !important; }
        }
      `}</style>
    </div>
  );
}

function LessonRow({ lesson, lessonNumber, active, done, cardColor, onClick }) {
  const [hov, setHov] = usePlayerState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', background: active ? `${cardColor}22` : hov ? 'rgba(255,255,255,.04)' : 'transparent', border: 'none', borderLeft: active ? `3px solid ${cardColor}` : '3px solid transparent', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'all .15s' }}>
      {/* Status icon */}
      <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: done ? '#d1fae5' : active ? cardColor : 'rgba(255,255,255,.08)', border: done || active ? 'none' : '1px solid rgba(255,255,255,.12)' }}>
        {done
          ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7l3 3 5-6" stroke="#059669" strokeWidth="1.8" strokeLinecap="round"/></svg>
          : active
            ? <svg width="12" height="12" viewBox="0 0 12 12" fill="white"><path d="M3 1.5l7 4.5-7 4.5V1.5z"/></svg>
            : <span style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', fontWeight: 600 }}>{lessonNumber}</span>
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: active ? 700 : 400, color: active ? '#fff' : done ? 'rgba(255,255,255,.6)' : 'rgba(255,255,255,.75)', lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {lesson.title.split('—').pop().trim()}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.3)', marginTop: 2 }}>{lesson.duration}</div>
      </div>
    </button>
  );
}

Object.assign(window, { PlayerPage });
