"""
server.py — VisionFit Python Bridge
====================================
Streams the OpenCV/MediaPipe processed camera feed as MJPEG and pushes
live rep count, stage, confidence, and form warnings to the React
frontend via Socket.IO.

Usage:
    pip install flask flask-cors flask-socketio
    python server.py

Then open the React app and start an exercise.
"""

import cv2
import threading
import time
from flask import Flask, Response, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO
from main import PullUpCounter

# ─── App setup ──────────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

# ─── Shared state ────────────────────────────────────────────────────────────
tracker = PullUpCounter()
cap = None
frame_lock = threading.Lock()
latest_frame = None          # JPEG bytes of the latest processed frame
is_tracking = False
stats_cache = {
    "reps": 0,
    "stage": "DOWN",
    "confidence": 0.0,
    "form_warnings": [],
    "active": False,
}

# ─── Background capture thread ───────────────────────────────────────────────
def capture_loop():
    global cap, latest_frame, is_tracking, stats_cache

    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    cap.set(cv2.CAP_PROP_FPS, 30)

    print("[server] Camera opened")

    while is_tracking:
        ret, frame = cap.read()
        if not ret:
            time.sleep(0.05)
            continue

        # Mirror for natural view
        frame = cv2.flip(frame, 1)

        # Run the MediaPipe tracker
        processed = tracker.process_frame(frame)

        # Get live stats from tracker
        st = tracker.get_stats()
        stats_cache.update(st)
        stats_cache["active"] = True

        # Emit stats to all connected clients ~15 fps
        socketio.emit("tracker_update", stats_cache)

        # Encode frame as JPEG
        _, buf = cv2.imencode(".jpg", processed, [cv2.IMWRITE_JPEG_QUALITY, 75])
        with frame_lock:
            latest_frame = buf.tobytes()

        time.sleep(1 / 30)

    # Cleanup
    if cap:
        cap.release()
    cap = None
    stats_cache["active"] = False
    socketio.emit("tracker_update", stats_cache)
    print("[server] Camera released")


def generate_mjpeg():
    """Yields MJPEG boundary frames from the latest_frame buffer."""
    while True:
        with frame_lock:
            frame = latest_frame
        if frame:
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + frame + b"\r\n"
            )
        time.sleep(1 / 30)


# ─── Routes ──────────────────────────────────────────────────────────────────
@app.route("/video_feed")
def video_feed():
    """MJPEG stream — drop this into <img src="http://localhost:5000/video_feed">"""
    return Response(
        generate_mjpeg(),
        mimetype="multipart/x-mixed-replace; boundary=frame",
    )


@app.route("/start", methods=["POST"])
def start_tracker():
    global is_tracking
    if is_tracking:
        return jsonify({"status": "already_running"})
    tracker.counter = 0
    tracker.stage = None
    tracker.bar_y = None
    is_tracking = True
    t = threading.Thread(target=capture_loop, daemon=True)
    t.start()
    print("[server] Tracker started")
    return jsonify({"status": "started"})


@app.route("/stop", methods=["POST"])
def stop_tracker():
    global is_tracking
    is_tracking = False
    print("[server] Tracker stopped")
    return jsonify({"status": "stopped"})


@app.route("/reset", methods=["POST"])
def reset_tracker():
    tracker.counter = 0
    tracker.stage = None
    tracker.bar_y = None
    stats_cache["reps"] = 0
    stats_cache["stage"] = "DOWN"
    stats_cache["form_warnings"] = []
    socketio.emit("tracker_update", stats_cache)
    print("[server] Counter reset")
    return jsonify({"status": "reset"})


@app.route("/stats")
def get_stats():
    return jsonify(stats_cache)


@app.route("/health")
def health():
    return jsonify({"ok": True})


# ─── Entry point ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 50)
    print("  VisionFit Python Bridge")
    print("  MJPEG stream : http://localhost:5000/video_feed")
    print("  Health check : http://localhost:5000/health")
    print("=" * 50)
    socketio.run(app, host="0.0.0.0", port=5000, debug=False)
