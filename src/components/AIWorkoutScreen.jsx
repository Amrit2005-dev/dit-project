import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PoseDetector } from '../ai/poseDetection.js';
import { ExerciseDetector } from '../ai/exerciseDetectors.js';
import { routines } from '../data/exercises';

const SERVER = (import.meta.env.VITE_API_URL || 'http://localhost:5050').replace(/\/$/, '');

function PhoneShell({ children, accent }) {
  return (
    <div className="phone-outer">
      <div className="phone-mockup" style={accent ? { '--glow': accent + '22' } : {}}>
        <div className="phone-notch"><div className="notch-camera" /><div className="notch-speaker" /></div>
        <div className="phone-screen">{children}</div>
        <div className="phone-home-bar" />
      </div>
    </div>
  );
}

function AIWorkoutScreen({ routineId }) {
  const nav = useNavigate();
  const routineData = routines[routineId];
  const accentColor = routineId === 'upper_lower' ? '#FF5FA0' : '#7C6BFF';

  const [screen, setScreen] = useState('exercise');
  const [selectedEx, setSelectedEx] = useState(null);
  const [reps, setReps] = useState(0);
  const [stage, setStage] = useState('UP');
  const [confidence, setConfidence] = useState(0);
  const [serverOnline, setServerOnline] = useState(false);
  const [serverStatus, setServerStatus] = useState('checking'); // 'checking' | 'online' | 'offline' | 'waking'
  const [tracking, setTracking] = useState(false);
  const [timer, setTimer] = useState(120); // 2 minutes in seconds
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [workoutStarted, setWorkoutStarted] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const poseDetectorRef = useRef(null);
  const exerciseDetectorRef = useRef(null);
  const socketRef = useRef(null);
  const stageRef = useRef('UP');
  const timerRef = useRef(null);

  const exercises = useMemo(() => {
    if (!routineData) return [];
    return Object.keys(routineData)
      .filter((k) => !['name', 'type', 'description'].includes(k))
      .flatMap((k) => routineData[k] || []);
  }, [routineData]);

  const target = selectedEx?.reps || 10;
  const progress = Math.min((reps / target) * 100, 100);

  useEffect(() => {
    // Ping with retry to handle Render free-tier cold starts (can take 30-60s)
    let cancelled = false;
    async function pingWithRetry(attempts = 5, delayMs = 10000) {
      for (let i = 0; i < attempts; i++) {
        if (cancelled) return;
        if (i === 0) setServerStatus('checking');
        else setServerStatus('waking');
        try {
          const res = await fetch(`${SERVER}/health`, { signal: AbortSignal.timeout(8000) });
          if (!cancelled && res.ok) {
            setServerOnline(true);
            setServerStatus('online');
            return;
          }
        } catch (_) { /* network error or timeout — keep retrying */ }
        if (i < attempts - 1 && !cancelled) {
          await new Promise(r => setTimeout(r, delayMs));
        }
      }
      if (!cancelled) { setServerOnline(false); setServerStatus('offline'); }
    }
    pingWithRetry();
    return () => { cancelled = true; stopCameraTracking(); };
  }, []);

  const handlePoseResults = (results) => {
    if (exerciseDetectorRef.current && results.poseLandmarks) {
      const detection = exerciseDetectorRef.current.detect(results.poseLandmarks);
      setReps(detection.reps);
      setStage(detection.state === 'up' ? 'UP' : 'DOWN');
      setConfidence(85); // Dummy confidence for MediaPipe
    }
  };

  useEffect(() => {
    if (isTimerActive && timer > 0) {
      timerRef.current = setTimeout(() => {
        setTimer(timer - 1);
      }, 1000);
    } else if (timer === 0 && isTimerActive) {
      setIsTimerActive(false);
      finishSession(timer);
    }
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isTimerActive, timer]);

  async function startCameraTracking(exerciseData) {
    setTracking(true);
    setTimeout(async () => {
      if (videoRef.current && canvasRef.current && !poseDetectorRef.current) {
        poseDetectorRef.current = new PoseDetector(
          videoRef.current,
          canvasRef.current,
          handlePoseResults
        );
      }
      const actualEx = exerciseData || selectedEx;
      const nameObj = actualEx?.name?.toLowerCase() || '';
      let exType = 'pushup';
      if (nameObj.includes('squat') || nameObj.includes('leg') || nameObj.includes('calf')) exType = 'squat';
      else if (nameObj.includes('curl')) exType = 'bicep_curl';
      else if (nameObj.includes('pull') || nameObj.includes('row')) exType = 'pullup';
      else if (nameObj.includes('shoulder')) exType = 'shoulder_press';
      else if (nameObj.includes('tricep') || nameObj.includes('dip')) exType = 'dip';
      else if (nameObj.includes('plank')) exType = 'plank';
      else if (nameObj.includes('bicycle')) exType = 'bicycle_crunch';
      else if (nameObj.includes('twist')) exType = 'russian_twist';
      else if (nameObj.includes('mountain')) exType = 'mountain_climber';
      else if (nameObj.includes('crunch')) exType = 'crunch';
      
      exerciseDetectorRef.current = new ExerciseDetector(exType);
      
      if (poseDetectorRef.current) {
        await poseDetectorRef.current.startCamera();
        exerciseDetectorRef.current.reset();
      }
    }, 100);
  }

  function stopCameraTracking() {
    if (poseDetectorRef.current) {
      poseDetectorRef.current.stopCamera();
    }
    setTracking(false);
  }

  async function handleStart(ex) {
    setSelectedEx(ex);
    setReps(0);
    setStage('UP');
    stageRef.current = 'UP';
    
    // Reset timer for static exercises
    if (ex.static) {
      setTimer(120); // 2 minutes
      setIsTimerActive(false);
      setWorkoutStarted(false);
    }
    
    setScreen('camera');
    setTimeout(() => startCameraTracking(ex), 100);
  }

  function startTimer() {
    setIsTimerActive(true);
    setWorkoutStarted(true);
  }

  async function finishSession(finalReps = reps) {
    await stopCameraTracking();
    setIsTimerActive(false);
    try {
      await fetch(`${SERVER}/save_progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exercise: selectedEx?.name || 'unknown',
          reps: selectedEx?.static ? 120 - timer : finalReps, // For static exercises, save time held
          timestamp: new Date().toISOString(),
        }),
      });
    } catch(err) {
      console.error(err);
    }
    setScreen('done');
  }

  async function goBack() {
    await stopCameraTracking();
    setScreen('exercise');
  }

  async function resetAll() {
    await stopCameraTracking();
    setSelectedEx(null);
    setReps(0);
    setStage('UP');
    setConfidence(0);
    setTimer(120);
    setIsTimerActive(false);
    setWorkoutStarted(false);
    setScreen('exercise');
  }

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
            <div style={{ fontSize: 11, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
              {serverStatus === 'checking' && <><span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#888', animation: 'pulse 1s infinite' }} />  <span style={{ color: '#888' }}>Checking backend…</span></>}
              {serverStatus === 'waking' && <><span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#FFCA28', animation: 'pulse 1s infinite' }} /><span style={{ color: '#FFCA28' }}>Backend waking up… (may take ~30s)</span></>}
              {serverStatus === 'online' && <><span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#3DDB85' }} /><span style={{ color: '#3DDB85' }}>Backend online</span></>}
              {serverStatus === 'offline' && <><span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#FF5F6D' }} /><span style={{ color: '#FF5F6D' }}>Backend offline — AI tracking uses device only</span></>}
            </div>
            {exercises.map((ex, i) => (
              <article key={i} className="card" style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontWeight: 700 }}>{ex.name}</p>
                    <p className="card-sub">{ex.static ? `${ex.reps} hold` : `${ex.reps} reps target`}</p>
                  </div>
                  <button className="btn-primary" style={{ background: accentColor }} onClick={() => handleStart(ex)}>
                    Start
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </PhoneShell>
    );
  }

  if (screen === 'camera') {
    const isStaticExercise = selectedEx?.static;
    const formatTime = (seconds) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
      <PhoneShell accent={accentColor}>
        <div className="screen">
          <header className="top-bar">
            <div className="top-bar-left">
              <p className="eyebrow" style={{ color: accentColor }}>{tracking ? 'LIVE · PoseNet Camera' : 'Starting camera...'}</p>
              <h1 className="screen-title">{selectedEx?.name}</h1>
            </div>
            <button className="icon-btn" onClick={goBack}>
              <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
          </header>

          <div className="scroll-body">
            <div className="cam-box" style={{ 
              position: 'relative', 
              aspectRatio: '4/3', 
              overflow: 'hidden',
              background: '#1a1d27',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', opacity: tracking ? 1 : 0 }}
              />
              <canvas
                ref={canvasRef}
                style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', zIndex: 10, opacity: tracking ? 1 : 0 }}
              />
              {!tracking && (
                <div style={{ textAlign: 'center', color: '#666', zIndex: 1 }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>📹</div>
                  <p style={{ fontSize: 16, fontWeight: 600 }}>AI Pose Detection Feed</p>
                  <p style={{ fontSize: 14, color: '#888', marginTop: 8 }}>
                    Loading your camera securely...
                  </p>
                </div>
              )}
            </div>

            {isStaticExercise && !workoutStarted && (
              <article className="card">
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Ready to start your {selectedEx?.name}?</p>
                  <p style={{ color: 'var(--sub)', marginBottom: 20 }}>Hold for {selectedEx?.reps} to complete this exercise</p>
                  <button 
                    className="btn-primary" 
                    style={{ background: accentColor, padding: '16px 32px', fontSize: 18 }}
                    onClick={startTimer}
                  >
                    Start Timer
                  </button>
                </div>
              </article>
            )}

            {(isStaticExercise ? workoutStarted : true) && (
              <article className="card counter-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p className="eyebrow">{isStaticExercise ? 'Time Remaining' : 'Reps Counted'}</p>
                    <p style={{ fontSize: 42, fontWeight: 900, color: accentColor }}>
                      {isStaticExercise ? formatTime(timer) : (
                        <>
                          {reps} <span style={{ fontSize: 16 }}>/ {target}</span>
                        </>
                      )}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontWeight: 800 }}>{stage}</p>
                    <p style={{ fontSize: 12, color: 'var(--sub)' }}>Conf: {confidence}%</p>
                  </div>
                </div>
                <div style={{ background: 'var(--border)', borderRadius: 6, height: 8, marginTop: 8 }}>
                  <div 
                    style={{ 
                      height: '100%', 
                      width: `${isStaticExercise ? ((120 - timer) / 120) * 100 : progress}%`, 
                      background: accentColor, 
                      borderRadius: 6 
                    }} 
                  />
                </div>
              </article>
            )}

            <button className="btn-secondary wide" onClick={() => finishSession(reps)}>Finish Exercise</button>
          </div>
        </div>
      </PhoneShell>
    );
  }

  const isStaticExercise = selectedEx?.static;
  const result = isStaticExercise ? `${120 - timer}s held` : `${reps} reps`;

  return (
    <PhoneShell accent={accentColor}>
      <div className="screen">
        <header className="top-bar">
          <div className="top-bar-left">
            <p className="eyebrow" style={{ color: accentColor }}>Exercise Complete</p>
            <h1 className="screen-title">Well Done!</h1>
          </div>
        </header>
        <div className="scroll-body">
          <article className="card done-card" style={{ textAlign: 'center', padding: 24 }}>
            <p style={{ fontSize: 22, fontWeight: 900, color: accentColor }}>{result}</p>
            <p className="card-sub">{selectedEx?.name}</p>
          </article>
          <button className="btn-primary" style={{ background: accentColor, width: '100%' }} onClick={resetAll}>Do Another Exercise</button>
          <button className="btn-secondary wide" onClick={() => { resetAll(); nav(`/dashboard/${routineId}`); }}>Back to Dashboard</button>
        </div>
      </div>
    </PhoneShell>
  );
}

export default AIWorkoutScreen;
