import { Routes, Route, useNavigate, useParams } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import './App.css'
import { saveUserProfile, saveSelectedRoutine, getSelectedRoutine, getUserProfile } from './db'
import AIWorkoutScreen from './components/AIWorkoutScreen'

/* ─────────────────────────────────────────────
   DATA
───────────────────────────────────────────── */
const ROUTINES = {
  push_pull: {
    id: 'push_pull',
    name: 'Push / Pull Split',
    tag: '2-Day Split',
    color: '#7C6BFF',
    glow: '#7C6BFF44',
    icon: '💪',
    days: [
      {
        label: 'Day 1 — Chest + Triceps',
        tag: 'Push Day',
        exercises: [
          { name: 'Bench Press', sets: 4, reps: '8–10', muscle: 'Chest' },
          { name: 'Incline Dumbbell Press', sets: 3, reps: '10', muscle: 'Chest' },
          { name: 'Chest Fly', sets: 3, reps: '12', muscle: 'Chest' },
          { name: 'Tricep Rope Pushdown', sets: 3, reps: '10–12', muscle: 'Triceps' },
          { name: 'Overhead Tricep Extension', sets: 3, reps: '10', muscle: 'Triceps' },
        ],
      },
      {
        label: 'Day 2 — Back + Biceps + Legs',
        tag: 'Pull + Lower',
        exercises: [
          { name: 'Barbell Squat', sets: 4, reps: '8–10', muscle: 'Legs' },
          { name: 'Lat Pulldown', sets: 3, reps: '10', muscle: 'Back' },
          { name: 'Seated Cable Row', sets: 3, reps: '10', muscle: 'Back' },
          { name: 'Barbell Bicep Curl', sets: 3, reps: '10', muscle: 'Biceps' },
          { name: 'Hammer Curl', sets: 3, reps: '12', muscle: 'Biceps' },
        ],
      },
    ],
    schedule: { Mon: 'Push', Tue: 'Rest', Wed: 'Pull', Thu: 'Rest', Fri: 'Push', Sat: 'Cardio', Sun: 'Rest' },
  },
  upper_lower: {
    id: 'upper_lower',
    name: 'Upper / Lower Split',
    tag: '4-Day Split',
    color: '#FF5FA0',
    glow: '#FF5FA044',
    icon: '🏋️',
    days: [
      {
        label: 'Day 1 — Upper Body',
        tag: 'Upper',
        exercises: [
          { name: 'Bench Press', sets: 4, reps: '8', muscle: 'Chest' },
          { name: 'Shoulder Dumbbell Press', sets: 3, reps: '10', muscle: 'Shoulders' },
          { name: 'Lat Pulldown', sets: 3, reps: '10', muscle: 'Back' },
          { name: 'Dumbbell Bicep Curl', sets: 3, reps: '10', muscle: 'Biceps' },
          { name: 'Tricep Dips', sets: 3, reps: '12', muscle: 'Triceps' },
        ],
      },
      {
        label: 'Day 2 — Lower Body',
        tag: 'Lower',
        exercises: [
          { name: 'Barbell Squat', sets: 4, reps: '8', muscle: 'Quads' },
          { name: 'Leg Press', sets: 3, reps: '10', muscle: 'Quads' },
          { name: 'Leg Curl', sets: 3, reps: '12', muscle: 'Hamstrings' },
          { name: 'Calf Raises', sets: 4, reps: '15', muscle: 'Calves' },
        ],
      },
    ],
    schedule: { Mon: 'Upper', Tue: 'Lower', Wed: 'Rest', Thu: 'Upper', Fri: 'Lower', Sat: 'Cardio', Sun: 'Rest' },
  },
}

const CALENDAR_DATA = {
  1:false, 2:false, 3:true, 4:false, 5:true,
  6:false, 7:false, 8:true, 9:false, 10:true,
  11:false, 12:true, 13:true, 14:false, 15:false,
  16:true, 17:false, 18:true, 19:false, 20:true,
  21:false, 22:true, 23:false, 24:false, 25:true,
  26:false, 27:true, 28:false, 29:false, 30:false, 31:false,
}

const TODAY_DATE = 13 // March 13

/* ─────────────────────────────────────────────
   PHONE SHELL
───────────────────────────────────────────── */
function PhoneShell({ children, accent }) {
  return (
    <div className="phone-outer">
      <div
        className="phone-mockup"
        style={accent ? { '--glow': accent + '22' } : {}}
      >
        <div className="phone-notch">
          <div className="notch-camera" />
          <div className="notch-speaker" />
        </div>
        <div className="phone-screen">{children}</div>
        <div className="phone-home-bar" />
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   SIGN IN
───────────────────────────────────────────── */
function SignIn() {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  function submit(e) {
    e.preventDefault()
    if (!email || !pass) { setErr('Please fill in all fields'); return }
    const stored = getUserProfile()
    if (!stored) {
      setErr('No account found. Please sign up first.')
      return
    }
    if (stored.email !== email || stored.password !== pass) {
      setErr('Invalid email or password.')
      return
    }
    setErr('')
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      nav('/select')
    }, 600)
  }

  return (
    <PhoneShell>
      <div className="auth-screen">
        <div className="auth-bg-orbs">
          <div className="orb orb1" />
          <div className="orb orb2" />
        </div>

        <div className="auth-logo">
          <div className="logo-ring">
            <span className="logo-bolt">⚡</span>
          </div>
          <h1 className="logo-text">VisionFit</h1>
          <p className="logo-tagline">AI-Powered Fitness · Group 9</p>
        </div>

        <form className="auth-form" onSubmit={submit}>
          <div className="auth-form-header">
            <h2>Welcome back</h2>
            <p>Sign in to your account</p>
          </div>

          {err && <div className="auth-err">{err}</div>}

          <div className="field">
            <label>Email</label>
            <div className="input-wrap">
              <svg viewBox="0 0 24 24"><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm16 2l-8 7-8-7"/></svg>
              <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
          </div>

          <div className="field">
            <label>Password</label>
            <div className="input-wrap">
              <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <input type="password" placeholder="••••••••" value={pass} onChange={e => setPass(e.target.value)} />
            </div>
          </div>

          <button type="submit" className={`btn-primary ${loading ? 'loading' : ''}`} disabled={loading}>
            {loading ? <span className="spinner" /> : 'Sign In'}
          </button>

          <div className="divider"><span>or</span></div>

          <p className="auth-switch">
            New here?{' '}
            <span className="link" onClick={() => nav('/signup')}>Create account →</span>
          </p>
        </form>
      </div>
    </PhoneShell>
  )
}

/* ─────────────────────────────────────────────
   SIGN UP
───────────────────────────────────────────── */
function SignUp() {
  const nav = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function submit(e) {
    e.preventDefault()
    if (!form.name || !form.email || !form.password) { setErr('All fields are required'); return }
    if (form.password !== form.confirm) { setErr('Passwords do not match'); return }
    setErr(''); setLoading(true)
    setTimeout(() => {
      saveUserProfile({
        name: form.name,
        email: form.email,
        password: form.password,
      })
      setLoading(false)
      nav('/select')
    }, 900)
  }

  return (
    <PhoneShell>
      <div className="auth-screen compact">
        <div className="auth-bg-orbs">
          <div className="orb orb1" />
          <div className="orb orb3" />
        </div>

        <div className="auth-logo small">
          <div className="logo-ring small">
            <span className="logo-bolt">⚡</span>
          </div>
          <h1 className="logo-text">VisionFit</h1>
        </div>

        <form className="auth-form" onSubmit={submit}>
          <div className="auth-form-header">
            <h2>Create account</h2>
            <p>Start your AI fitness journey</p>
          </div>

          {err && <div className="auth-err">{err}</div>}

          <div className="field">
            <label>Full Name</label>
            <div className="input-wrap">
              <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <input placeholder="Alex Johnson" value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>Email</label>
            <div className="input-wrap">
              <svg viewBox="0 0 24 24"><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm16 2l-8 7-8-7"/></svg>
              <input type="email" placeholder="you@example.com" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>Password</label>
            <div className="input-wrap">
              <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <input type="password" placeholder="••••••••" value={form.password} onChange={e => set('password', e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>Confirm Password</label>
            <div className="input-wrap">
              <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <input type="password" placeholder="••••••••" value={form.confirm} onChange={e => set('confirm', e.target.value)} />
            </div>
          </div>

          <button type="submit" className={`btn-primary ${loading ? 'loading' : ''}`} disabled={loading}>
            {loading ? <span className="spinner" /> : 'Create Account'}
          </button>

          <p className="auth-switch">
            Already a member?{' '}
            <span className="link" onClick={() => nav('/')}>Sign In →</span>
          </p>
        </form>
      </div>
    </PhoneShell>
  )
}

/* ─────────────────────────────────────────────
   ROUTINE SELECT
───────────────────────────────────────────── */
function WorkoutSelect() {
  const nav = useNavigate()
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    const prev = getSelectedRoutine()
    if (prev) setSelected(prev)
  }, [])

  return (
    <PhoneShell>
      <div className="select-screen">
        <div className="select-header">
          <p className="eyebrow">Step 1 of 1</p>
          <h1>Choose Your<br />Routine</h1>
          <p className="select-sub">Your AI coach will personalise workouts based on your choice.</p>
        </div>

        <div className="routine-options">
          {Object.values(ROUTINES).map(r => (
            <div
              key={r.id}
              className={`routine-option ${selected === r.id ? 'selected' : ''}`}
              style={{ '--rc': r.color }}
              onClick={() => setSelected(r.id)}
            >
              <div className="ro-emoji-wrap" style={{ background: r.color + '22' }}>{r.icon}</div>
              <div className="ro-body">
                <span className="ro-tag" style={{ color: r.color }}>{r.tag}</span>
                <h3>{r.name}</h3>
                <p>{r.days[0].exercises.length + r.days[1].exercises.length} exercises · {r.days.length} workout types</p>
              </div>
              <div
                className="ro-check"
                style={{
                  background: selected === r.id ? r.color : 'transparent',
                  borderColor: r.color,
                }}
              >
                {selected === r.id && '✓'}
              </div>
            </div>
          ))}
        </div>

        <div className="select-tip">
          <span className="tip-icon">💡</span>
          <p>Warm up 5–10 min · Rest 60–90 sec between sets · Eat enough protein</p>
        </div>

        <div className="select-actions">
          <button
            className="btn-primary"
            disabled={!selected}
            onClick={() => {
              saveSelectedRoutine(selected)
              nav(`/dashboard/${selected}`)
            }}
          >
            Get Started →
          </button>
          <p className="auth-switch" style={{ marginTop: 10 }}>
            <span className="link" onClick={() => nav('/')}>← Back</span>
          </p>
        </div>
      </div>
    </PhoneShell>
  )
}

/* ─────────────────────────────────────────────
   BOTTOM NAV
───────────────────────────────────────────── */
function BottomNav({ tab, routineId }) {
  const nav = useNavigate()
  const tabs = [
    {
      id: 'dashboard', label: 'Home', path: `/dashboard/${routineId}`,
      icon: <svg viewBox="0 0 24 24"><path d="M3 12L12 3l9 9"/><path d="M9 21V12h6v9"/></svg>,
    },
    {
      id: 'calendar', label: 'Progress', path: `/calendar/${routineId}`,
      icon: <svg viewBox="0 0 24 24"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>,
    },
    {
      id: 'ai', label: 'AI', path: `/ai/${routineId}`,
      icon: (
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="8" r="4"/>
          <path d="M8 12.5C5.5 13.5 4 15.5 4 18h16c0-2.5-1.5-4.5-4-5.5"/>
          <path d="M12 12v2M9 14h6"/>
        </svg>
      ),
    },
    {
      id: 'chat', label: 'Coach', path: `/chat/${routineId}`,
      icon: <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
    },
  ]
  return (
    <nav className="bottom-nav">
      {tabs.map(t => (
        <button
          key={t.id}
          className={`tab ${tab === t.id ? 'active' : ''}`}
          onClick={() => nav(t.path)}
        >
          <span className="tab-icon">{t.icon}</span>
          <span className="tab-label">{t.label}</span>
          {tab === t.id && <span className="tab-dot" />}
        </button>
      ))}
    </nav>
  )
}

/* ─────────────────────────────────────────────
   DASHBOARD
───────────────────────────────────────────── */
function Dashboard({ routineId }) {
  const nav = useNavigate()
  const r = ROUTINES[routineId]
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const todayName = dayNames[new Date().getDay()]
  const todayWork = r.schedule[todayName] || 'Rest'
  const completedDays = Object.values(CALENDAR_DATA).filter(Boolean).length
  const progress = Math.round((completedDays / 31) * 100)
  const circ = 2 * Math.PI * 38
  const dash = (progress / 100) * circ

  return (
    <PhoneShell accent={r.color}>
      <div className="screen">
        {/* Header */}
        <header className="top-bar">
          <div className="top-bar-left">
            <p className="eyebrow" style={{ color: r.color }}>VisionFit · Group 9</p>
            <h1 className="screen-title">Workouts</h1>
          </div>
          <div className="top-bar-right">
            <button className="icon-btn">
              <svg viewBox="0 0 24 24"><path d="M4 6h16M7 12h10M10 18h4"/></svg>
            </button>
            <button className="icon-btn" onClick={() => nav(`/ai/${routineId}`)}>
              <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
            </button>
          </div>
        </header>

        <div className="scroll-body">

          {/* Today's Workout Card */}
          <article className="card workout-hero" style={{ '--acc': r.color, '--glow': r.glow }}>
            <div className="hero-glow" style={{ background: `radial-gradient(circle at 80% 50%, ${r.color}30 0%, transparent 70%)` }} />
            <div className="ring-wrap">
              <svg viewBox="0 0 100 100" className="ring-svg">
                <circle cx="50" cy="50" r="38" className="ring-bg" />
                <circle
                  cx="50" cy="50" r="38"
                  className="ring-progress"
                  style={{
                    stroke: r.color,
                    strokeDasharray: `${dash} ${circ}`,
                    filter: `drop-shadow(0 0 6px ${r.color})`,
                  }}
                />
              </svg>
              <div className="ring-inner">
                <span className="ring-pct" style={{ color: r.color }}>{progress}%</span>
                <span className="ring-sub">done</span>
              </div>
            </div>
            <div className="hero-info">
              <span className="hero-pill" style={{ background: r.color + '30', color: r.color }}>
                {todayName} · Today
              </span>
              <h2 className="hero-name">{todayWork === 'Rest' ? 'Rest Day' : todayWork}</h2>
              <p className="hero-sub">{todayWork === 'Rest' ? 'Recovery & mobility' : r.name}</p>
              {todayWork !== 'Rest' && (
                <button
                  className="hero-btn"
                  style={{ background: r.color }}
                  onClick={() => nav(`/ai/${routineId}`)}
                >
                  ▶ Start AI Workout
                </button>
              )}
            </div>
          </article>

          {/* Stats Row */}
          <div className="row2">
            <article className="card stat-tile">
              <p className="tile-label">Body Weight</p>
              <div className="tile-value-row">
                <span className="tile-num">190</span>
                <span className="tile-unit">lbs</span>
              </div>
              <p className="tile-sub">↔ Stable this week</p>
            </article>
            <article className="card stat-tile">
              <p className="tile-label">Weekly Volume</p>
              <div className="tile-value-row">
                <span className="tile-num" style={{ color: r.color }}>3.2k</span>
                <span className="tile-unit">lbs</span>
              </div>
              <p className="tile-sub" style={{ color: '#3DDB85' }}>↑ +8% vs last week</p>
            </article>
          </div>

          {/* Calendar Card */}
          <article className="card">
            <div className="card-head">
              <div>
                <p className="eyebrow">March 2026</p>
                <p className="card-sub">{completedDays} workouts logged</p>
              </div>
              <span className="month-badge" style={{ color: r.color }}>{completedDays} / 31</span>
            </div>
            <div className="cal-header-row">
              {['M','T','W','T','F','S','S'].map((d, i) => (
                <span key={i} className="cal-day-lbl">{d}</span>
              ))}
            </div>
            <div className="cal-grid">
              {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                <span
                  key={d}
                  className={`cdot${CALENDAR_DATA[d] ? ' hit' : ''}${d === TODAY_DATE ? ' today' : ''}`}
                  style={CALENDAR_DATA[d] ? { background: r.color, boxShadow: `0 0 6px ${r.color}88` } : {}}
                />
              ))}
            </div>
          </article>

          {/* Routine Card */}
          <article className="card routine-card" onClick={() => nav(`/calendar/${routineId}`)}>
            <div className="card-head">
              <div>
                <p className="eyebrow">Active Routine</p>
                <h3 className="routine-name">{r.name}</h3>
                <p className="card-sub">{r.tag}</p>
              </div>
              <span className="routine-emoji">{r.icon}</span>
            </div>
            <div className="sched-strip">
              {Object.entries(r.schedule).map(([day, work]) => (
                <div key={day} className={`sched-col${day === todayName ? ' today' : ''}`}>
                  <span className="sched-day">{day}</span>
                  <span
                    className={`sched-dot${work !== 'Rest' ? ' active' : ''}`}
                    style={work !== 'Rest' ? { background: r.color } : {}}
                  />
                </div>
              ))}
            </div>
            <div className="card-arrow">
              <svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
              <span>View schedule</span>
            </div>
          </article>

          {/* AI Card */}
          <button className="card ai-card" onClick={() => nav(`/ai/${routineId}`)}>
            <div className="ai-card-left">
              <div className="ai-card-icon" style={{ background: r.color }}>
                <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
              </div>
              <div>
                <p className="ai-card-title">AI Pull-Up Counter</p>
                <p className="card-sub">Real-time rep detection via webcam</p>
              </div>
            </div>
            <svg className="card-chevron" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
          </button>

        </div>

        <BottomNav tab="dashboard" routineId={routineId} />
      </div>
    </PhoneShell>
  )
}

/* ─────────────────────────────────────────────
   PROGRESS / CALENDAR
───────────────────────────────────────────── */
function CalendarScreen({ routineId }) {
  const nav = useNavigate()
  const r = ROUTINES[routineId]
  const [activeDay, setActiveDay] = useState(null)
  const completedDays = Object.values(CALENDAR_DATA).filter(Boolean).length
  const weekVol = [2800, 3100, 2600, 3200, 2900, 3400, 3200]
  const maxVol = Math.max(...weekVol)
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <PhoneShell accent={r.color}>
      <div className="screen">
        <header className="top-bar">
          <div className="top-bar-left">
            <p className="eyebrow" style={{ color: r.color }}>VisionFit · Group 9</p>
            <h1 className="screen-title">Progress</h1>
          </div>
          <button className="icon-btn" onClick={() => nav(`/dashboard/${routineId}`)}>
            <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
        </header>

        <div className="scroll-body">

          {/* Stat strip */}
          <div className="stat-strip card">
            {[
              { val: completedDays, lbl: 'Workouts' },
              { val: 8, lbl: 'Day Streak' },
              { val: '190', lbl: 'lbs Weight' },
            ].map((s, i) => (
              <>
                {i > 0 && <div key={`div-${i}`} className="strip-divider" />}
                <div key={s.lbl} className="strip-stat">
                  <span className="strip-num" style={{ color: r.color }}>{s.val}</span>
                  <span className="strip-lbl">{s.lbl}</span>
                </div>
              </>
            ))}
          </div>

          {/* Calendar */}
          <article className="card">
            <div className="card-head">
              <div>
                <p className="eyebrow">March 2026</p>
                <p className="card-sub">Tap a date to see details</p>
              </div>
            </div>
            <div className="cal-header-row">
              {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
                <span key={d} className="cal-day-lbl">{d}</span>
              ))}
            </div>
            <div className="cal-grid big">
              {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                <button
                  key={d}
                  className={`cdot-btn${CALENDAR_DATA[d] ? ' hit' : ''}${d === TODAY_DATE ? ' today' : ''}${activeDay === d ? ' sel' : ''}`}
                  style={CALENDAR_DATA[d] ? { background: r.color, boxShadow: `0 0 6px ${r.color}88` } : {}}
                  onClick={() => setActiveDay(activeDay === d ? null : d)}
                >
                  {d}
                </button>
              ))}
            </div>
            {activeDay && (
              <div className="day-popup" style={{ borderColor: r.color }}>
                <p className="eyebrow">March {activeDay}, 2026</p>
                <p className="card-sub" style={{ marginTop: 4 }}>
                  {CALENDAR_DATA[activeDay]
                    ? `✅  Workout logged · ${r.name}`
                    : '⚪  Rest day — no workout logged'}
                </p>
              </div>
            )}
          </article>

          {/* Bar chart */}
          <article className="card">
            <p className="eyebrow" style={{ marginBottom: 2 }}>Weekly Volume</p>
            <p className="card-sub" style={{ marginBottom: 14 }}>Total weight lifted (lbs)</p>
            <div className="bar-chart">
              {weekVol.map((v, i) => (
                <div key={i} className="bar-col">
                  <span className="bar-top">{(v / 1000).toFixed(1)}k</span>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{
                        height: `${(v / maxVol) * 100}%`,
                        background: i === 6 ? r.color : '#252837',
                        boxShadow: i === 6 ? `0 0 10px ${r.color}88` : 'none',
                      }}
                    />
                  </div>
                  <span className="bar-lbl">{weekDays[i]}</span>
                </div>
              ))}
            </div>
          </article>

          {/* Exercise list */}
          <article className="card">
            <p className="eyebrow" style={{ marginBottom: 14 }}>Routine Exercises</p>
            {r.days.map((day, di) => (
              <div key={di} className="ex-day-block">
                <div className="ex-day-head">
                  <span className="ex-tag" style={{ background: r.color + '22', color: r.color }}>{day.tag}</span>
                  <span className="ex-day-title">{day.label}</span>
                </div>
                {day.exercises.map((ex, ei) => (
                  <div key={ei} className="ex-row">
                    <div className="ex-num">{ei + 1}</div>
                    <div className="ex-info">
                      <span className="ex-name">{ex.name}</span>
                      <span className="ex-detail">{ex.sets} sets × {ex.reps} reps · {ex.muscle}</span>
                    </div>
                    <span className="ex-sets">{ex.sets}×</span>
                  </div>
                ))}
              </div>
            ))}
          </article>

        </div>

        <BottomNav tab="calendar" routineId={routineId} />
      </div>
    </PhoneShell>
  )
}

/* ─────────────────────────────────────────────
   AI PULL-UP COUNTER
───────────────────────────────────────────── */
function AIPullUp({ routineId }) {
  const nav = useNavigate()
  const r = ROUTINES[routineId]
  const videoRef = useRef(null)
  const [phase, setPhase] = useState('idle')
  const [reps, setReps] = useState(0)
  const [stage, setStage] = useState('DOWN')
  const [camOk, setCamOk] = useState(false)
  const [pulse, setPulse] = useState(false)
  const timerRef = useRef(null)

  async function startCam() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      if (videoRef.current) { videoRef.current.srcObject = stream; setCamOk(true) }
    } catch { setCamOk(false) }
  }

  function stopCam() {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop())
      videoRef.current.srcObject = null
    }
    setCamOk(false)
  }

  function startWorkout() {
    setPhase('active'); setReps(0); setStage('DOWN')
    startCam()
    let count = 0, s = 'DOWN'
    timerRef.current = setInterval(() => {
      s = s === 'DOWN' ? 'UP' : 'DOWN'
      setStage(s)
      if (s === 'UP') {
        count += 1
        setReps(count)
        setPulse(true)
        setTimeout(() => setPulse(false), 400)
        if (count >= 10) { clearInterval(timerRef.current); setTimeout(finish, 1200) }
      }
    }, 1300)
  }

  function finish() {
    clearInterval(timerRef.current); stopCam(); setPhase('done')
  }

  function reset() {
    clearInterval(timerRef.current); stopCam()
    setPhase('idle'); setReps(0); setStage('DOWN')
  }

  useEffect(() => () => { clearInterval(timerRef.current); stopCam() }, [])

  return (
    <PhoneShell accent={r.color}>
      <div className="screen">
        <header className="top-bar">
          <div className="top-bar-left">
            <p className="eyebrow" style={{ color: r.color }}>AI Trainer · MediaPipe</p>
            <h1 className="screen-title">Pull-Up Counter</h1>
          </div>
          <button className="icon-btn" onClick={() => { reset(); nav(`/dashboard/${routineId}`) }}>
            <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
        </header>

        <div className="scroll-body">

          {phase === 'idle' && (
            <>
              <article className="card ai-intro">
                <div className="ai-intro-badge" style={{ background: r.color + '22', color: r.color }}>
                  ⚡ AI-Powered · OpenCV + MediaPipe Pose
                </div>
                <h2 className="ai-intro-title">Real-Time<br />Rep Detection</h2>
                <p className="ai-intro-desc">
                  Computer vision tracks 33 body landmarks in real-time —
                  detecting your wrist and head positions to automatically
                  count valid pull-up reps with live feedback.
                </p>
                <div className="ai-feats">
                  {[
                    { c: '#4CC9F0', t: 'Bounding boxes around both hands (Blue)' },
                    { c: '#FF6B6B', t: 'Bounding box around head (Red)' },
                    { c: '#00FF88', t: 'Auto bar detection from wrist height' },
                    { c: r.color,   t: 'UP / DOWN stage with smart rep counting' },
                    { c: '#FFCA28', t: 'Mirror view for natural workout feedback' },
                  ].map(f => (
                    <div key={f.t} className="ai-feat">
                      <span className="ai-feat-dot" style={{ background: f.c }} />
                      <span>{f.t}</span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="card">
                <p className="eyebrow" style={{ marginBottom: 12 }}>How It Works</p>
                {[
                  { n: '1', t: 'Position camera so your full body is visible', c: r.color },
                  { n: '2', t: 'Hang from bar — arms extended (DOWN stage)', c: '#4CC9F0' },
                  { n: '3', t: 'Pull up until head rises above your hands (UP stage)', c: '#00FF88' },
                  { n: '4', t: 'Lower down — one clean rep is counted!', c: '#FFCA28' },
                ].map(s => (
                  <div key={s.n} className="how-step">
                    <div className="how-num" style={{ background: s.c }}>{s.n}</div>
                    <p className="how-text">{s.t}</p>
                  </div>
                ))}
              </article>

              <button
                className="btn-primary"
                style={{ background: r.color, width: '100%' }}
                onClick={startWorkout}
              >
                ▶ Start AI Workout
              </button>
            </>
          )}

          {phase === 'active' && (
            <>
              {/* Camera */}
              <div className="cam-box" style={{ borderColor: r.color + '88' }}>
                {camOk
                  ? <video ref={videoRef} autoPlay playsInline muted className="cam-video" />
                  : (
                    <div className="cam-sim">
                      <AnimatedFigure stage={stage} color={r.color} />
                    </div>
                  )
                }
                {/* Overlay labels */}
                <div className="cam-top-row">
                  <span className="cam-tag blue">◻ Hand L</span>
                  <span className="cam-tag red">◻ Head</span>
                  <span className="cam-tag blue">◻ Hand R</span>
                </div>
                <div className="cam-bar-line">
                  <span className="cam-bar-label" style={{ color: '#00FF88' }}>— PULL-UP BAR —</span>
                </div>
                <div className={`stage-pill ${stage === 'UP' ? 'up' : 'down'}`}>
                  {stage === 'UP' ? '⬆ UP' : '⬇ DOWN'}
                </div>
                <div className="cam-bottom-row">
                  <span className="cam-info">Python · OpenCV · MediaPipe</span>
                </div>
              </div>

              {/* Rep counter */}
              <article className={`card counter-card ${pulse ? 'pulse' : ''}`} style={{ '--acc': r.color }}>
                <div className="counter-top">
                  <div>
                    <p className="eyebrow">Reps Counted</p>
                    <div className="rep-row">
                      <span className="rep-big" style={{ color: r.color }}>{reps}</span>
                      <span className="rep-of">/ 10</span>
                    </div>
                  </div>
                  <div className={`stage-badge ${stage === 'UP' ? 'up' : 'down'}`}>
                    {stage}
                  </div>
                </div>
                <div className="rep-bar-track">
                  <div className="rep-bar-fill" style={{ width: `${reps * 10}%`, background: r.color }} />
                </div>
                <div className="rep-pips">
                  {Array.from({ length: 10 }, (_, i) => (
                    <div
                      key={i}
                      className="pip"
                      style={i < reps ? { background: r.color, boxShadow: `0 0 6px ${r.color}` } : {}}
                    />
                  ))}
                </div>
              </article>

              <button className="btn-secondary wide" onClick={finish}>Finish Workout</button>
            </>
          )}

          {phase === 'done' && (
            <>
              <article className="card done-card">
                <div className="done-trophy" style={{ background: r.color + '22', color: r.color }}>🏆</div>
                <h2 className="done-h">Workout Complete!</h2>
                <p className="card-sub">Great session, keep pushing!</p>
                <div className="done-stats">
                  {[
                    { v: reps, l: 'Pull-Ups' },
                    { v: 1, l: 'Set' },
                    { v: `~${reps * 12}`, l: 'lbs Vol.' },
                  ].map(s => (
                    <div key={s.l} className="done-stat">
                      <span className="done-num" style={{ color: r.color }}>{s.v}</span>
                      <span className="done-lbl">{s.l}</span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="card">
                <p className="eyebrow" style={{ marginBottom: 12 }}>Session Summary</p>
                {[
                  ['Exercise', 'Pull-Ups'],
                  ['Total Reps', reps],
                  ['Detection System', 'MediaPipe AI'],
                  ['Landmarks', '33 body points'],
                  ['Routine', r.name],
                ].map(([k, v]) => (
                  <div key={k} className="sum-row">
                    <span className="sum-key">{k}</span>
                    <span className="sum-val">{v}</span>
                  </div>
                ))}
              </article>

              <button className="btn-primary wide" style={{ background: r.color }} onClick={reset}>
                ↺ Another Set
              </button>
              <button className="btn-secondary wide" onClick={() => { reset(); nav(`/dashboard/${routineId}`) }}>
                ← Dashboard
              </button>
            </>
          )}

        </div>

        <BottomNav tab="ai" routineId={routineId} />
      </div>
    </PhoneShell>
  )
}

/* Animated pull-up figure for simulation */
function AnimatedFigure({ stage, color }) {
  const isUp = stage === 'UP'
  return (
    <svg viewBox="0 0 200 280" className="figure-svg">
      {/* Bar */}
      <rect x="10" y="30" width="180" height="6" rx="3" fill="#00FF88" opacity="0.9"/>
      <text x="100" y="22" textAnchor="middle" fontSize="9" fill="#00FF88" fontWeight="700">PULL-UP BAR</text>

      {/* Arms (hands in blue box) */}
      <line x1="60" y1="36" x2={isUp ? 70 : 60} y2={isUp ? 70 : 100} stroke="#4CC9F0" strokeWidth="3" strokeLinecap="round"/>
      <line x1="140" y1="36" x2={isUp ? 130 : 140} y2={isUp ? 70 : 100} stroke="#4CC9F0" strokeWidth="3" strokeLinecap="round"/>

      {/* Hand boxes */}
      <rect x="45" y="24" width="22" height="14" rx="4" fill="none" stroke="#4CC9F0" strokeWidth="1.5" opacity="0.8"/>
      <rect x="133" y="24" width="22" height="14" rx="4" fill="none" stroke="#4CC9F0" strokeWidth="1.5" opacity="0.8"/>
      <text x="56" y="34" textAnchor="middle" fontSize="7" fill="#4CC9F0">L</text>
      <text x="144" y="34" textAnchor="middle" fontSize="7" fill="#4CC9F0">R</text>

      {/* Head (red box) */}
      <circle cx="100" cy={isUp ? 55 : 120} r="18" fill="#1a1d27" stroke="#FF6B6B" strokeWidth="2" style={{ transition: 'cy 0.4s ease' }}/>
      <rect x="80" y={isUp ? 35 : 100} width="40" height="40" rx="6" fill="none" stroke="#FF6B6B" strokeWidth="1.5" opacity="0.7"/>
      <text x="100" y={isUp ? 28 : 94} textAnchor="middle" fontSize="7" fill="#FF6B6B">HEAD</text>

      {/* Eyes */}
      <circle cx="93" cy={isUp ? 53 : 118} r="2.5" fill="#4CC9F0"/>
      <circle cx="107" cy={isUp ? 53 : 118} r="2.5" fill="#4CC9F0"/>
      <path d={`M93 ${isUp ? 60 : 125}q7 4 14 0`} stroke="#4CC9F0" strokeWidth="1.5" fill="none" strokeLinecap="round"/>

      {/* Body */}
      <line x1="100" y1={isUp ? 73 : 138} x2="100" y2={isUp ? 120 : 185} stroke={color} strokeWidth="3" strokeLinecap="round"/>
      {/* Legs */}
      <line x1="100" y1={isUp ? 120 : 185} x2="82" y2={isUp ? 155 : 225} stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="100" y1={isUp ? 120 : 185} x2="118" y2={isUp ? 155 : 225} stroke={color} strokeWidth="2.5" strokeLinecap="round"/>

      {/* Stage label */}
      <text x="100" y="260" textAnchor="middle" fontSize="11" fill={isUp ? '#00FF88' : '#FF6B6B'} fontWeight="900" letterSpacing="2">
        {stage}
      </text>
    </svg>
  )
}

/* ─────────────────────────────────────────────
   CHAT
───────────────────────────────────────────── */
const PRESETS = [
  'What muscles do pull-ups work?',
  'How many rest days do I need?',
  'Best protein for muscle gain?',
  'How to improve pull-up form?',
]
const BOT = {
  'What muscles do pull-ups work?':
    'Pull-ups target your latissimus dorsi (lats) as the primary muscle, with secondary activation of biceps, rear deltoids, rhomboids, and core. They\'re one of the best compound upper-body movements!',
  'How many rest days do I need?':
    'Most people need 1–2 rest days per week. Your current routine already accounts for this — rest days on Tue, Thu, and Sun are perfect for recovery and muscle protein synthesis.',
  'Best protein for muscle gain?':
    'Top sources: Chicken breast (31g/100g), Greek yogurt, Eggs (6g each), Tuna, Lean beef, and Whey protein. Aim for ~0.8–1g of protein per lb of bodyweight per day.',
  'How to improve pull-up form?':
    '1. Start from a full dead hang\n2. Engage core + squeeze glutes\n3. Drive elbows down toward your hips\n4. Chin clears the bar at the top\n5. Lower slowly (3-second negatives)\n\nThe AI counter will track your reps in real time!',
}

function ChatScreen({ routineId }) {
  const r = ROUTINES[routineId]
  const [msgs, setMsgs] = useState([
    { from: 'bot', text: `Hey! I'm your VisionFit AI coach 💪\n\nI can help with workout tips, exercise form, nutrition, and more.\nWhat's on your mind?` },
  ])
  const [input, setInput] = useState('')
  const endRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  function send(text) {
    const msg = text || input.trim()
    if (!msg) return
    setInput('')
    setMsgs(m => [...m, { from: 'user', text: msg }])
    setTimeout(() => {
      const reply = BOT[msg] || `Great question! Based on your ${r.name} routine, focus on progressive overload and adequate recovery. The AI counter can help track reps for any exercise — keep logging your sessions!`
      setMsgs(m => [...m, { from: 'bot', text: reply }])
    }, 700)
  }

  return (
    <PhoneShell accent={r.color}>
      <div className="screen chat-screen">
        <header className="top-bar">
          <div className="top-bar-left">
            <p className="eyebrow" style={{ color: r.color }}>AI Coach · Group 9</p>
            <h1 className="screen-title">Coach Chat</h1>
          </div>
          <div className="coach-av" style={{ background: r.color }}>AI</div>
        </header>

        <div className="chat-msgs">
          {msgs.map((m, i) => (
            <div key={i} className={`msg-wrap ${m.from}`}>
              {m.from === 'bot' && <div className="bot-av" style={{ background: r.color }}>AI</div>}
              <div className={`bubble ${m.from}`} style={m.from === 'user' ? { background: r.color } : {}}>
                {m.text.split('\n').map((line, li) => (
                  <p key={li} style={{ margin: 0, lineHeight: 1.55 }}>{line}</p>
                ))}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <div className="preset-row">
          {PRESETS.map(p => (
            <button key={p} className="preset" onClick={() => send(p)}>{p}</button>
          ))}
        </div>

        <div className="chat-bar">
          <input
            className="chat-input"
            placeholder="Ask your AI coach..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
          />
          <button className="send-btn" style={{ background: r.color }} onClick={() => send()}>
            <svg viewBox="0 0 24 24"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7Z"/></svg>
          </button>
        </div>

        <BottomNav tab="chat" routineId={routineId} />
      </div>
    </PhoneShell>
  )
}

/* ─────────────────────────────────────────────
   ROUTER
───────────────────────────────────────────── */
function R({ C }) { const { routineId } = useParams(); return <C routineId={routineId} /> }

export default function App() {
  return (
    <Routes>
      <Route path="/"                    element={<SignIn />} />
      <Route path="/signup"              element={<SignUp />} />
      <Route path="/select"              element={<WorkoutSelect />} />
      <Route path="/dashboard/:routineId" element={<R C={Dashboard} />} />
      <Route path="/calendar/:routineId"  element={<R C={CalendarScreen} />} />
      <Route path="/ai/:routineId"        element={<R C={AIWorkoutScreen} />} />
      <Route path="/chat/:routineId"      element={<R C={ChatScreen} />} />
    </Routes>
  )
}
