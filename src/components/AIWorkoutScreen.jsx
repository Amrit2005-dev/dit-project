import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import { routines } from '../data/exercises';

const SERVER = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

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

function angle(a, b, c) {
  if (!a || !b || !c) return null;
  const abx = a.x - b.x;
  const aby = a.y - b.y;
  const cbx = c.x - b.x;
  const cby = c.y - b.y;
  const dot = abx * cbx + aby * cby;
  const magAB = Math.hypot(abx, aby);
  const magCB = Math.hypot(cbx, cby);
  if (!magAB || !magCB) return null;
  const val = Math.max(-1, Math.min(1, dot / (magAB * magCB)));
  return (Math.acos(val) * 180) / Math.PI;
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
  const [tracking, setTracking] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const poseLandmarkerRef = useRef(null);
  const rafRef = useRef(null);
  const streamRef = useRef(null);
  const socketRef = useRef(null);
  const stageRef = useRef('UP');

  const exercises = useMemo(() => {
    if (!routineData) return [];
    return Object.keys(routineData)
      .filter((k) => !['name', 'type', 'description'].includes(k))
      .flatMap((k) => routineData[k] || []);
  }, [routineData]);

  const target = selectedEx?.reps || 10;
  const progress = Math.min((reps / target) * 100, 100);

  useEffect(() => {
    const socket = io(SERVER, { transports: ['polling', 'websocket'], autoConnect: true });
    socketRef.current = socket;
    socket.on('connect', () => setServerOnline(true));
    socket.on('disconnect', () => setServerOnline(false));
    socket.on('connect_error', () => setServerOnline(false));

    fetch(`${SERVER}/health`).then(() => setServerOnline(true)).catch(() => setServerOnline(false));
    return () => socket.disconnect();
  }, []);

  async function startCameraTracking() {
    if (!videoRef.current || !canvasRef.current) return;
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false,
    });
    streamRef.current = stream;
    videoRef.current.srcObject = stream;
    await videoRef.current.play();

    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    );
    const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
      },
      runningMode: 'VIDEO',
      numPoses: 1,
    });
    poseLandmarkerRef.current = poseLandmarker;

    const renderLoop = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const poseLandmarker = poseLandmarkerRef.current;
      if (!video || !canvas || !poseLandmarker) return;

      const ctx = canvas.getContext('2d');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const result = poseLandmarker.detectForVideo(video, performance.now());
      const k = result.landmarks?.[0];
      if (k?.length) {
        const leftShoulder = k[11];
        const leftElbow = k[13];
        const leftWrist = k[15];
        const rightShoulder = k[12];
        const rightElbow = k[14];
        const rightWrist = k[16];

        const la = angle(leftShoulder, leftElbow, leftWrist);
        const ra = angle(rightShoulder, rightElbow, rightWrist);
        const vals = [la, ra].filter((v) => typeof v === 'number');
        if (vals.length) {
          const avgElbow = vals.reduce((a, b) => a + b, 0) / vals.length;
          const keySet = [leftShoulder, leftElbow, leftWrist, rightShoulder, rightElbow, rightWrist].filter(Boolean);
          const conf = Math.round((keySet.reduce((a, b) => a + (b.visibility || 0), 0) / keySet.length) * 100);
          setConfidence(conf);

          if (avgElbow < 90 && stageRef.current === 'UP') {
            stageRef.current = 'DOWN';
            setStage('DOWN');
          } else if (avgElbow > 150 && stageRef.current === 'DOWN') {
            stageRef.current = 'UP';
            setStage('UP');
            setReps((prev) => {
              const next = prev + 1;
              socketRef.current?.emit('live_rep_update', { reps: next, stage: 'UP', ts: Date.now() });
              if (next >= target) setTimeout(() => finishSession(next), 500);
              return next;
            });
          }
        }
      }

      rafRef.current = requestAnimationFrame(renderLoop);
    };

    rafRef.current = requestAnimationFrame(renderLoop);
    setTracking(true);
  }

  async function stopCameraTracking() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    poseLandmarkerRef.current?.close();
    poseLandmarkerRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    streamRef.current = null;
    setTracking(false);
  }

  async function handleStart(ex) {
    setSelectedEx(ex);
    setReps(0);
    setStage('UP');
    stageRef.current = 'UP';
    setScreen('camera');
    setTimeout(() => startCameraTracking(), 100);
  }

  async function finishSession(finalReps = reps) {
    await stopCameraTracking();
    try {
      await fetch(`${SERVER}/save_progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exercise: selectedEx?.name || 'unknown',
          reps: finalReps,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch {}
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
            <div style={{ fontSize: 11, color: serverOnline ? '#3DDB85' : '#FF5F6D', marginBottom: 8 }}>
              {serverOnline ? 'Backend online' : 'Backend offline'}
            </div>
            {exercises.map((ex, i) => (
              <article key={i} className="card" style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontWeight: 700 }}>{ex.name}</p>
                    <p className="card-sub">{ex.reps} reps target</p>
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
    return (
      <PhoneShell accent={accentColor}>
        <div className="screen">
          <header className="top-bar">
            <div className="top-bar-left">
              <p className="eyebrow" style={{ color: accentColor }}>{tracking ? 'LIVE · Browser Camera' : 'Starting camera...'}</p>
              <h1 className="screen-title">{selectedEx?.name}</h1>
            </div>
            <button className="icon-btn" onClick={goBack}>
              <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
          </header>

          <div className="scroll-body">
            <div className="cam-box" style={{ position: 'relative', aspectRatio: '4/3', overflow: 'hidden' }}>
              <video ref={videoRef} playsInline muted style={{ display: 'none' }} />
              <canvas ref={canvasRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>

            <article className="card counter-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p className="eyebrow">Reps Counted</p>
                  <p style={{ fontSize: 42, fontWeight: 900, color: accentColor }}>{reps} <span style={{ fontSize: 16 }}>/ {target}</span></p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontWeight: 800 }}>{stage}</p>
                  <p style={{ fontSize: 12, color: 'var(--sub)' }}>Conf: {confidence}%</p>
                </div>
              </div>
              <div style={{ background: 'var(--border)', borderRadius: 6, height: 8, marginTop: 8 }}>
                <div style={{ height: '100%', width: `${progress}%`, background: accentColor, borderRadius: 6 }} />
              </div>
            </article>

            <button className="btn-secondary wide" onClick={() => finishSession(reps)}>Finish Exercise</button>
          </div>
        </div>
      </PhoneShell>
    );
  }

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
            <p style={{ fontSize: 22, fontWeight: 900, color: accentColor }}>{reps} reps</p>
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
