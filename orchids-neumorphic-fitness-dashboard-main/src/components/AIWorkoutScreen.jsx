import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { routines } from '../data/exercises';

const SERVER = 'http://localhost:5000';

/* ─────────────────────────────────────────────
   Reusable Phone Shell (mirrors App.jsx)
───────────────────────────────────────────── */
function PhoneShell({ children, accent }) {
  return (
    <div className="phone-outer">
      <div className="phone-mockup" style={accent ? { '--glow': accent + '22' } : {}}>
        <div className="phone-notch">
          <div className="notch-camera" />
          <div className="notch-speaker" />
        </div>
        <div className="phone-screen">{children}</div>
        <div className="phone-home-bar" />
      </div>
    </div>
  );
}

function diffColor(d) {
  if (d === 'beginner')     return '#3DDB85';
  if (d === 'intermediate') return '#FFCA28';
  return '#FF5F6D';
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
function AIWorkoutScreen({ routineId }) {
  const nav = useNavigate();

  /* UI state */
  const [screen, setScreen]     = useState('exercise'); // 'exercise' | 'camera' | 'done'
  const [selectedEx, setEx]     = useState(null);

  /* Python tracker state — updated from Socket.IO */
  const [reps, setReps]                 = useState(0);
  const [stage, setStage]               = useState('DOWN');
  const [confidence, setConfidence]     = useState(0);
  const [formWarnings, setFormWarnings] = useState([]);
  const [serverOnline, setServerOnline] = useState(false);
  const [trackerRunning, setTrackerRunning] = useState(false);
  const [pulse, setPulse]               = useState(false);
  const [cameraMode, setCameraMode]     = useState('front');

  /* Fallback sim */
  const [simReps, setSimReps] = useState(0);

  const socketRef = useRef(null);
  const prevRepsRef = useRef(0);

  const routineData = routines[routineId];
  const accentColor = routineId === 'upper_lower' ? '#FF5FA0' : '#7C6BFF';

  const getAllExercises = () => {
    if (!routineData) return [];
    return Object.keys(routineData)
      .filter(k => !['name','type','description'].includes(k))
      .flatMap(k => routineData[k] || []);
  };
  const exercises = getAllExercises();
  const activeReps = serverOnline ? reps : simReps;
  const target = selectedEx?.reps || 10;
  const progress = Math.min((activeReps / target) * 100, 100);

  /* ── Socket.IO connection ─────────────────── */
  useEffect(() => {
    const socket = io(SERVER, { transports: ['websocket'], autoConnect: false });
    socketRef.current = socket;

    socket.on('connect', () => setServerOnline(true));
    socket.on('disconnect', () => { setServerOnline(false); setTrackerRunning(false); });
    socket.on('connect_error', () => setServerOnline(false));

    socket.on('tracker_update', (data) => {
      setReps(data.reps);
      setStage(data.stage);
      setConfidence(data.confidence);
      setFormWarnings(data.form_warnings || []);

      if (data.reps > prevRepsRef.current) {
        setPulse(true);
        setTimeout(() => setPulse(false), 350);
        if (data.reps >= (selectedEx ? selectedEx.reps : 10) && screen === 'camera') {
          setTimeout(async () => { 
              await stopTracker();
              try {
                await fetch(`${SERVER}/save_progress`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ exercise: selectedEx ? selectedEx.name : 'Unknown', reps: data.reps })
                });
              } catch (e) {}
              setScreen('done'); 
          }, 900);
        }
      }
      prevRepsRef.current = data.reps;
    });

    socket.on('camera_toggled', (data) => {
      setCameraMode(data.camera_mode);
    });

    socket.connect();
    return () => socket.disconnect();
  }, []); // eslint-disable-line

  /* ── Tracker control ─────────────────────── */
  const startTracker = useCallback(async () => {
    try {
      const res = await fetch(`${SERVER}/start`, { method: 'POST' });
      if (res.ok) setTrackerRunning(true);
    } catch { /* server offline */ }
  }, []);

  const stopTracker = useCallback(async () => {
    try {
      await fetch(`${SERVER}/stop`, { method: 'POST' });
    } catch { /* ignore */ }
    setTrackerRunning(false);
  }, []);

  const resetTracker = useCallback(async () => {
    prevRepsRef.current = 0;
    try {
      await fetch(`${SERVER}/reset`, { method: 'POST' });
    } catch { /* ignore */ }
    setReps(0); setSimReps(0); setStage('DOWN'); setFormWarnings([]);
  }, []);

  const toggleCamera = useCallback(async () => {
    try {
      const res = await fetch(`${SERVER}/toggle_camera`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setCameraMode(data.camera_mode);
      }
    } catch { /* server offline */ }
  }, []);

  /* ── Exercise selection ──────────────────── */
  async function handleStart(ex) {
    setEx(ex);
    setSimReps(0);
    setScreen('camera');
    await resetTracker();
    await startTracker();
  }

  async function handleBack() {
    await stopTracker();
    await resetTracker();
    setScreen('exercise');
  }

  /* ── Fallback simulate rep ───────────────── */
  function simulateRep() {
    setSimReps(prev => {
      const next = Math.min(prev + 1, target);
      setPulse(true);
      setTimeout(() => setPulse(false), 350);
      if (next >= target) setTimeout(async () => { 
        await stopTracker();
        try {
          await fetch(`${SERVER}/save_progress`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ exercise: selectedEx?.name || 'unknown', reps: next })
          });
        } catch (e) {}
        setScreen('done'); 
      }, 900);
      return next;
    });
  }

  async function finishEarly() {
    await stopTracker();
    try {
      await fetch(`${SERVER}/save_progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exercise: selectedEx?.name || 'unknown', reps: activeReps })
      });
    } catch (e) {}
    setScreen('done');
  }

  async function resetAll() {
    await stopTracker();
    await resetTracker();
    setEx(null);
    setSimReps(0);
    setScreen('exercise');
  }

  /* ══════════════════════════════════════════
     EXERCISE LIST SCREEN
  ══════════════════════════════════════════ */
  if (screen === 'exercise') {
    return (
      <PhoneShell accent={accentColor}>
        <div className="screen">
          <header className="top-bar">
            <div className="top-bar-left">
              <p className="eyebrow" style={{ color: accentColor }}>AI Trainer · Today</p>
              <h1 className="screen-title">Today's Workout</h1>
            </div>
            <button className="icon-btn" onClick={() => nav(`/dashboard/${routineId}`)}>
              <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
          </header>

          <div className="scroll-body">

            {/* Server status banner */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', borderRadius: 10,
              background: serverOnline ? '#3DDB8515' : '#FF5F6D15',
              border: `1px solid ${serverOnline ? '#3DDB8540' : '#FF5F6D40'}`,
              marginBottom: 2,
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: serverOnline ? '#3DDB85' : '#FF5F6D',
                boxShadow: serverOnline ? '0 0 6px #3DDB85' : 'none',
              }}/>
              <span style={{ fontSize: 11, color: serverOnline ? '#3DDB85' : '#FF5F6D', fontWeight: 600 }}>
                {serverOnline
                  ? '🟢 Python tracker connected'
                  : '🔴 Python server offline — run server.py for live tracking'}
              </span>
            </div>

            <p className="card-sub" style={{ marginBottom: 4 }}>
              {exercises.length} exercises · {routineData?.name}
            </p>

            {exercises.map((ex, i) => (
              <article key={i} className="card" style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="ex-num" style={{ width: 36, height: 36, borderRadius: 12, fontSize: 14, flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, color: 'var(--text)' }}>{ex.name}</p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: 'var(--sub)' }}>🎯 {ex.reps} reps</span>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6,
                        textTransform: 'uppercase', letterSpacing: '0.4px',
                        background: diffColor(ex.difficulty) + '22', color: diffColor(ex.difficulty),
                      }}>
                        {ex.difficulty}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--sub)' }}>🤖 AI Detection</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleStart(ex)}
                    style={{
                      background: accentColor, color: '#fff', border: 'none',
                      borderRadius: 10, padding: '8px 14px', fontSize: 12,
                      fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
                    }}
                  >
                    Start →
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </PhoneShell>
    );
  }

  /* ══════════════════════════════════════════
     CAMERA / REP COUNTER SCREEN
  ══════════════════════════════════════════ */
  if (screen === 'camera') {
    return (
      <PhoneShell accent={accentColor}>
        <div className="screen">
          <header className="top-bar">
            <div className="top-bar-left">
              <p className="eyebrow" style={{ color: accentColor }}>
                {serverOnline && trackerRunning ? '🔴 LIVE · MediaPipe Active' : 'AI Detection'}
              </p>
              <h1 className="screen-title">{selectedEx?.name}</h1>
            </div>
            <button className="icon-btn" onClick={handleBack}>
              <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
          </header>

          <div className="scroll-body">

            {/* Live camera feed (MJPEG stream) OR placeholder */}
            <div className="cam-box" style={{
              borderColor: accentColor + '88',
              aspectRatio: '4/3',
              position: 'relative',
            }}>
              {serverOnline && trackerRunning ? (
                <>
                  {/* MJPEG stream — processed frames from Python with bounding boxes */}
                  <img
                    src={`${SERVER}/video_feed`}
                    alt="Live camera"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    onError={() => setServerOnline(false)}
                  />
                  {/* LIVE badge */}
                  <div style={{
                    position: 'absolute', top: 10, left: 12,
                    background: '#FF3B30', borderRadius: 6, padding: '3px 9px',
                    fontSize: 10, fontWeight: 800, color: '#fff', letterSpacing: '0.4px',
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', animation: 'none' }}/>
                    LIVE
                  </div>
                  {/* Camera mode indicator */}
                  <div style={{
                    position: 'absolute', top: 10, left: 80,
                    background: cameraMode === 'front' ? '#FFCA28' : '#5AC8FA',
                    borderRadius: 6, padding: '3px 9px',
                    fontSize: 10, fontWeight: 800, color: '#fff', letterSpacing: '0.4px',
                  }}>
                    {cameraMode === 'front' ? '📱 FRONT' : '📷 BACK'}
                  </div>
                  {/* Confidence meter */}
                  <div style={{
                    position: 'absolute', top: 10, right: 12,
                    background: 'rgba(0,0,0,0.7)', borderRadius: 6, padding: '3px 9px',
                    fontSize: 10, fontWeight: 700,
                    color: confidence >= 65 ? '#3DDB85' : '#FFCA28',
                  }}>
                    Conf: {confidence.toFixed(0)}%
                  </div>
                  {/* Stage overlay at bottom */}
                  <div style={{
                    position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)',
                    background: stage === 'UP' ? '#3DDB8522' : accentColor + '33',
                    border: `1px solid ${stage === 'UP' ? '#3DDB85' : accentColor}`,
                    borderRadius: 8, padding: '4px 14px',
                    fontSize: 13, fontWeight: 900, letterSpacing: '1px',
                    color: stage === 'UP' ? '#3DDB85' : accentColor,
                  }}>
                    {stage === 'UP' ? '⬆ UP' : '⬇ DOWN'}
                  </div>
                </>
              ) : (
                <div className="cam-sim" style={{ flexDirection: 'column', gap: 10 }}>
                  <span style={{ fontSize: 36 }}>🤖</span>
                  <p style={{ color: 'var(--sub)', fontSize: 12, textAlign: 'center', lineHeight: 1.5 }}>
                    {serverOnline
                      ? 'Starting camera...'
                      : <>Python server offline<br/><span style={{ fontSize: 10 }}>Run <code style={{ color: accentColor }}>python server.py</code> to go live</span></>
                    }
                  </p>
                </div>
              )}
            </div>

            {/* Form warnings from Python */}
            {formWarnings.length > 0 && (
              <div style={{
                background: '#FFCA2810', border: '1px solid #FFCA2830',
                borderRadius: 12, padding: '10px 14px',
                display: 'flex', flexDirection: 'column', gap: 5,
              }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#FFCA28', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>
                  Form Feedback
                </p>
                {formWarnings.map((w, i) => (
                  <p key={i} style={{ fontSize: 12, color: '#FFCA28CC', margin: 0 }}>{w}</p>
                ))}
              </div>
            )}

            {/* Rep counter card */}
            <article className="card counter-card" style={{
              outline: pulse ? `2px solid ${accentColor}` : '2px solid transparent',
              transition: 'outline 0.2s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div>
                  <p className="eyebrow">Reps Counted</p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                    <span style={{ fontSize: 52, fontWeight: 900, lineHeight: 1, color: accentColor }}>
                      {activeReps}
                    </span>
                    <span style={{ fontSize: 18, color: 'var(--sub)', fontWeight: 600 }}>/ {target}</span>
                  </div>
                </div>
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                }}>
                  <div style={{
                    padding: '6px 12px', borderRadius: 10,
                    background: stage === 'UP' ? '#3DDB8522' : accentColor + '22',
                    color: stage === 'UP' ? '#3DDB85' : accentColor,
                    fontSize: 13, fontWeight: 900, letterSpacing: '0.5px',
                  }}>
                    {serverOnline ? (stage === 'UP' ? '⬆ UP' : '⬇ DOWN') : '——'}
                  </div>
                  {serverOnline && (
                    <span style={{ fontSize: 10, color: confidence >= 65 ? '#3DDB85' : '#FFCA28' }}>
                      {confidence.toFixed(0)}% conf
                    </span>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ background: 'var(--border)', borderRadius: 6, height: 8, overflow: 'hidden', marginBottom: 10 }}>
                <div style={{
                  height: '100%', width: `${progress}%`,
                  background: accentColor,
                  borderRadius: 6,
                  boxShadow: `0 0 10px ${accentColor}88`,
                  transition: 'width 0.4s ease',
                }}/>
              </div>

              {/* Pip dots */}
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {Array.from({ length: target }, (_, i) => (
                  <div key={i} style={{
                    flex: 1, minWidth: 8, maxWidth: 28, height: 7, borderRadius: 4,
                    background: i < activeReps ? accentColor : 'var(--border)',
                    boxShadow: i < activeReps ? `0 0 5px ${accentColor}` : 'none',
                    transition: 'background 0.2s',
                  }}/>
                ))}
              </div>
            </article>

            {/* Action buttons */}
            {serverOnline && (
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className="btn-secondary"
                  style={{ flex: 1 }}
                  onClick={toggleCamera}
                >
                  📷 {cameraMode === 'front' ? 'Back' : 'Front'} Camera
                </button>
                <button
                  className="btn-primary"
                  style={{ flex: 1, background: accentColor }}
                  onClick={simulateRep}
                >
                  + Simulate Rep
                </button>
              </div>
            )}
            
            {!serverOnline && (
              <button className="btn-primary" style={{ background: accentColor, width: '100%' }} onClick={simulateRep}>
                + Simulate Rep (offline mode)
              </button>
            )}

            <button className="btn-secondary wide" onClick={finishEarly}>
              Finish Exercise Early
            </button>

          </div>
        </div>
      </PhoneShell>
    );
  }

  /* ══════════════════════════════════════════
     DONE SCREEN
  ══════════════════════════════════════════ */
  if (screen === 'done') {
    const finalReps = activeReps;
    return (
      <PhoneShell accent={accentColor}>
        <div className="screen">
          <header className="top-bar">
            <div className="top-bar-left">
              <p className="eyebrow" style={{ color: accentColor }}>Exercise Complete</p>
              <h1 className="screen-title">Well Done! 🏆</h1>
            </div>
          </header>

          <div className="scroll-body">
            <article className="card done-card" style={{ textAlign: 'center', padding: 28 }}>
              <div style={{
                width: 72, height: 72, borderRadius: 22,
                background: accentColor + '22',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 36, margin: '0 auto 14px',
              }}>🏆</div>
              <h2 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.4px', marginBottom: 6 }}>
                {selectedEx?.name} Complete!
              </h2>
              <p className="card-sub">Great session, keep pushing!</p>

              <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 24, padding: '16px 0', borderTop: '1px solid var(--border)' }}>
                {[
                  { v: finalReps, l: 'Reps Done' },
                  { v: target,    l: 'Target' },
                  { v: `${Math.round((finalReps / target) * 100)}%`, l: 'Completed' },
                ].map(s => (
                  <div key={s.l} style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 28, fontWeight: 900, color: accentColor, letterSpacing: '-0.5px' }}>{s.v}</p>
                    <p style={{ fontSize: 10, color: 'var(--sub)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 3 }}>{s.l}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="card">
              <p className="eyebrow" style={{ marginBottom: 12 }}>Session Summary</p>
              {[
                ['Exercise',   selectedEx?.name],
                ['Total Reps', finalReps],
                ['Difficulty', selectedEx?.difficulty],
                ['Detection',  serverOnline ? 'MediaPipe AI (live)' : 'Manual (offline)'],
                ['Routine',    routineData?.name],
              ].map(([k, v]) => (
                <div key={k} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '9px 0', borderBottom: '1px solid var(--border)',
                }}>
                  <span style={{ fontSize: 12, color: 'var(--sub)' }}>{k}</span>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{v}</span>
                </div>
              ))}
            </article>

            <button className="btn-primary" style={{ background: accentColor, width: '100%' }} onClick={resetAll}>
              ↺ Do Another Exercise
            </button>
            <button className="btn-secondary wide" onClick={() => { resetAll(); nav(`/dashboard/${routineId}`); }}>
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </PhoneShell>
    );
  }

  return null;
}

export default AIWorkoutScreen;
