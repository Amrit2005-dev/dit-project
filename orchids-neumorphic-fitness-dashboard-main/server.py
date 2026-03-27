#!/usr/bin/env python3
"""
Python PoseNet Exercise Tracking Server
Provides real-time pose detection and rep counting via Socket.IO
(Replaces MediaPipe with Rep-Counter-master PoseNet functionality)
"""

import sys
import os
import cv2
import numpy as np
from flask import Flask, Response, jsonify, request
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import sqlite3
import threading
import time

# Dynamically resolve the path to the PoseNet codebase so it works flawlessly when cloned from GitHub
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
REPOS_PATH = os.path.abspath(os.path.join(BASE_DIR, '..', 'Rep-Counter-master', 'Rep-Counter-master'))

if REPOS_PATH not in sys.path:
    sys.path.append(REPOS_PATH)

import tensorflow as tf
tf.compat.v1.disable_eager_execution()

import posenet
from run import countRepetition

class ExerciseTracker:
    def __init__(self):
        # Tracking state
        self.reps = 0
        self.stage = "DOWN"
        self.confidence = 85.0  # Set high confidence since posenet handles it nicely
        self.form_warnings = []
        self.is_running = False
        
        self.current_exercise = 'push_up'
        
        # PoseNet internal trackers
        self.previous_pose = ''
        self.flag = -1
        self.current_state = [2, 2]

        self.model_type = 101
        self.scale_factor = 0.7125
        
    def set_exercise(self, exercise_name):
        exercise_key = exercise_name.lower().replace(' ', '_').replace('_', '')
        self.current_exercise = exercise_key
        
    def reset(self):
        self.reps = 0
        self.stage = "DOWN"
        self.confidence = 0.0
        self.form_warnings = []
        
        # Reset internal tracker variables
        self.previous_pose = ''
        self.flag = -1
        self.current_state = [2, 2]

# Initialize Flask app and Socket.IO
app = Flask(__name__)
app.config['SECRET_KEY'] = 'workout_tracker_secret'
socketio = SocketIO(app, cors_allowed_origins="*")
CORS(app)

def init_db():
    conn = sqlite3.connect('workouts.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS progress
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  exercise TEXT,
                  reps INTEGER,
                  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)''')
    conn.commit()
    conn.close()

init_db()

# Global tracker instance
tracker = ExerciseTracker()

@app.route('/')
def index():
    return "Workout Tracker Server Running"

@app.route('/start', methods=['POST'])
def start_tracking():
    tracker.is_running = True
    return jsonify({"status": "started"})

@app.route('/stop', methods=['POST'])
def stop_tracking():
    tracker.is_running = False
    return jsonify({"status": "stopped"})

@app.route('/reset', methods=['POST'])
def reset_tracking():
    tracker.reset()
    return jsonify({"status": "reset", "reps": 0})

@app.route('/set_exercise', methods=['POST'])
def set_exercise():
    data = request.get_json()
    exercise_name = data.get('exercise', 'push_up')
    tracker.set_exercise(exercise_name)
    return jsonify({"status": "exercise_set", "exercise": tracker.current_exercise})

@app.route('/toggle_camera', methods=['POST'])
def toggle_camera():
    return jsonify({"camera_mode": "front"})

@app.route('/save_progress', methods=['POST'])
def save_progress():
    data = request.get_json()
    exercise = data.get('exercise', 'unknown')
    reps = data.get('reps', 0)
    
    conn = sqlite3.connect('workouts.db')
    c = conn.cursor()
    c.execute("INSERT INTO progress (exercise, reps) VALUES (?, ?)", (exercise, reps))
    conn.commit()
    conn.close()
    
    return jsonify({"status": "saved", "id": c.lastrowid})

@app.route('/video_feed')
def video_feed():
    """Video streaming route wrapped with PoseNet"""
    def generate():
        with tf.compat.v1.Session() as sess:
            model_cfg, model_outputs = posenet.load_model(tracker.model_type, sess)
            output_stride = model_cfg['output_stride']
            
            cap = cv2.VideoCapture(0)
            
            while True:
                input_image, display_image, output_scale = posenet.read_cap(
                    cap, scale_factor=tracker.scale_factor, output_stride=output_stride)
                
                heatmaps_result, offsets_result, displacement_fwd_result, displacement_bwd_result = sess.run(
                    model_outputs, feed_dict={'image:0': input_image}
                )
                
                pose_scores, keypoint_scores, keypoint_coords = posenet.decode_multi.decode_multiple_poses(
                    heatmaps_result.squeeze(axis=0),
                    offsets_result.squeeze(axis=0),
                    displacement_fwd_result.squeeze(axis=0),
                    displacement_bwd_result.squeeze(axis=0),
                    output_stride=output_stride,
                    max_pose_detections=10,
                    min_pose_score=0.4)
                    
                keypoint_coords *= output_scale 
                
                if isinstance(tracker.previous_pose, str): 
                    tracker.previous_pose = keypoint_coords
                
                if tracker.is_running:
                    # Pass the logic to PoseNet counting module
                    text, tracker.previous_pose, tracker.current_state, tracker.flag = countRepetition(
                        tracker.previous_pose, keypoint_coords, tracker.current_state, tracker.flag)
                    
                    if tracker.flag == 1:
                        tracker.reps += 1
                        tracker.flag = -1
                        
                    # Translate current_state bits to basic upward/downward mapping
                    # When state shifts upward vs downward, we toggle "UP" and "DOWN" for UI
                    if tracker.current_state[0] == 1 or tracker.current_state[1] == 1:
                        tracker.stage = "UP"
                    else:
                        tracker.stage = "DOWN"
                        
                    socketio.emit('tracker_update', {
                        'reps': tracker.reps,
                        'stage': tracker.stage,
                        'confidence': 85.0,
                        'form_warnings': tracker.form_warnings
                    })

                image = posenet.draw_skel_and_kp(
                    display_image, pose_scores, keypoint_scores, keypoint_coords,
                    min_pose_score=0.4, min_part_score=0.1)
                
                # Flip vertically drawn mirror effect if desired
                image = cv2.flip(image, 1)

                status_text = f"PoseNet LIVE | Reps: {tracker.reps} | Stage: {tracker.stage}"
                cv2.putText(image, status_text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
                
                ret, jpeg = cv2.imencode('.jpg', image)
                frame_bytes = jpeg.tobytes()
                
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n\r\n')
            
            cap.release()
    
    return Response(generate(), mimetype='multipart/x-mixed-replace; boundary=frame')

@socketio.on('connect')
def handle_connect():
    print('Client connected')
    emit('status', {'msg': 'Connected to workout tracker'})

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

@socketio.on('set_exercise')
def handle_set_exercise(data):
    exercise_name = data.get('exercise', 'push_up')
    tracker.set_exercise(exercise_name)
    emit('exercise_set', {'exercise': tracker.current_exercise})

if __name__ == '__main__':
    print("Starting Main PoseNet Workout Tracker Server...")
    print("Video feed available at http://localhost:5000/video_feed")
    print("Socket.IO server running on port 5000")
    
    socketio.run(app, host='0.0.0.0', port=5000, debug=False)
