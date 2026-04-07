#!/usr/bin/env python3
"""
Cloud-ready backend:
- API for saving/fetching workout progress
- Optional Socket.IO events for live UI sync
- No server-side camera or OpenCV loop
"""

import os
import sqlite3
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO, emit

app = Flask(__name__)
app.config["SECRET_KEY"] = "workout_tracker_secret"

# Allow local dev + hosted frontend. You can narrow this in production.
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*")

DB_PATH = "workouts.db"


def init_db():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS progress (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          exercise TEXT NOT NULL,
          reps INTEGER NOT NULL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    conn.commit()
    conn.close()


init_db()


@app.route("/")
def index():
    return "Workout API + Socket server running"


@app.route("/health")
def health():
    return jsonify({"ok": True})


@app.route("/save_progress", methods=["POST"])
def save_progress():
    data = request.get_json(silent=True) or {}
    exercise = data.get("exercise", "unknown")
    reps = int(data.get("reps", 0))
    timestamp = data.get("timestamp")

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    if timestamp:
        cur.execute(
            "INSERT INTO progress (exercise, reps, timestamp) VALUES (?, ?, ?)",
            (exercise, reps, timestamp),
        )
    else:
        cur.execute(
            "INSERT INTO progress (exercise, reps) VALUES (?, ?)",
            (exercise, reps),
        )
    row_id = cur.lastrowid
    conn.commit()
    conn.close()

    socketio.emit(
        "progress_saved",
        {"id": row_id, "exercise": exercise, "reps": reps, "timestamp": timestamp},
    )
    return jsonify({"status": "saved", "id": row_id})


@app.route("/history", methods=["GET"])
def history():
    limit = int(request.args.get("limit", 50))
    limit = max(1, min(limit, 500))

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute(
        "SELECT id, exercise, reps, timestamp FROM progress ORDER BY id DESC LIMIT ?",
        (limit,),
    )
    rows = cur.fetchall()
    conn.close()

    items = [
        {"id": r[0], "exercise": r[1], "reps": r[2], "timestamp": r[3]}
        for r in rows
    ]
    return jsonify({"items": items})


@socketio.on("connect")
def handle_connect():
    emit("status", {"msg": "Connected to workout backend"})


@socketio.on("live_rep_update")
def handle_live_rep_update(data):
    # Broadcast to all clients except sender (for multi-client dashboards)
    emit("live_rep_update", data, broadcast=True, include_self=False)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print("Starting Workout API + Socket server...")
    print(f"Listening on port {port}")
    socketio.run(app, host="0.0.0.0", port=port, debug=False)
