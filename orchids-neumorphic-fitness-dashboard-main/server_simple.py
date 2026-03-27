#!/usr/bin/env python3
"""
Simple Workout Tracker Server
Provides Socket.IO communication for exercise tracking
"""

from flask import Flask, Response, jsonify, request
from flask_socketio import SocketIO, emit
import threading
import time
import random
import cv2
import numpy as np

app = Flask(__name__)
app.config['SECRET_KEY'] = 'workout_tracker_secret'
socketio = SocketIO(app, cors_allowed_origins="*")

# Global state
tracker_state = {
    'reps': 0,
    'stage': 'DOWN',
    'confidence': 0.0,
    'form_warnings': [],
    'is_running': False,
    'current_exercise': 'push_up',
    'camera_mode': 'front'  # 'front' or 'back'
}

def simulate_exercise_tracking():
    """Simulate exercise tracking when MediaPipe is not available"""
    while True:
        if tracker_state['is_running']:
            # Simulate rep counting with random delays
            time.sleep(random.uniform(1.5, 3.0))
            
            if tracker_state['stage'] == 'DOWN':
                tracker_state['stage'] = 'UP'
                tracker_state['confidence'] = random.uniform(75, 95)
                tracker_state['form_warnings'] = []
            else:
                tracker_state['stage'] = 'DOWN'
                tracker_state['reps'] += 1
                tracker_state['confidence'] = random.uniform(70, 90)
                
                # Random form warnings
                if random.random() < 0.3:
                    warnings = [
                        "Keep your back straight",
                        "Lower your body more",
                        "Keep arms symmetrical",
                        "Engage your core"
                    ]
                    tracker_state['form_warnings'] = [random.choice(warnings)]
                else:
                    tracker_state['form_warnings'] = []
            
            # Emit update to connected clients
            socketio.emit('tracker_update', {
                'reps': tracker_state['reps'],
                'stage': tracker_state['stage'],
                'confidence': tracker_state['confidence'],
                'form_warnings': tracker_state['form_warnings']
            })
        else:
            time.sleep(0.5)

@app.route('/')
def index():
    return "Simple Workout Tracker Server Running"

@app.route('/start', methods=['POST'])
def start_tracking():
    """Start the tracking process"""
    tracker_state['is_running'] = True
    return jsonify({"status": "started"})

@app.route('/stop', methods=['POST'])
def stop_tracking():
    """Stop the tracking process"""
    tracker_state['is_running'] = False
    return jsonify({"status": "stopped"})

@app.route('/reset', methods=['POST'])
def reset_tracking():
    """Reset the tracking state"""
    tracker_state['reps'] = 0
    tracker_state['stage'] = 'DOWN'
    tracker_state['confidence'] = 0.0
    tracker_state['form_warnings'] = []
    return jsonify({"status": "reset", "reps": 0})

@app.route('/toggle_camera', methods=['POST'])
def toggle_camera():
    """Toggle between front and back camera"""
    current = tracker_state['camera_mode']
    tracker_state['camera_mode'] = 'back' if current == 'front' else 'front'
    
    # Emit camera change to all connected clients
    socketio.emit('camera_toggled', {
        'camera_mode': tracker_state['camera_mode'],
        'message': f"Switched to {tracker_state['camera_mode']} camera"
    })
    
    return jsonify({
        "status": "toggled", 
        "camera_mode": tracker_state['camera_mode']
    })

@app.route('/video_feed')
def video_feed():
    """Generate a simple video feed with overlay"""
    def generate():
        # Create a simple colored frame with text
        while True:
            # Create a black frame
            frame = np.zeros((480, 640, 3), dtype=np.uint8)
            
            # Add status text
            status_color = (0, 255, 0) if tracker_state['is_running'] else (0, 0, 255)
            status_text = f"Reps: {tracker_state['reps']} | Stage: {tracker_state['stage']} | {'TRACKING' if tracker_state['is_running'] else 'STOPPED'}"
            
            cv2.putText(frame, status_text, (20, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, status_color, 2)
            cv2.putText(frame, "Simple Workout Tracker", (20, 450), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            
            # Add exercise info
            cv2.putText(frame, f"Exercise: {tracker_state['current_exercise'].replace('_', ' ').title()}", (20, 100), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
            
            # Add camera mode
            camera_color = (255, 255, 0) if tracker_state['camera_mode'] == 'front' else (0, 255, 255)
            cv2.putText(frame, f"Camera: {tracker_state['camera_mode'].upper()}", (20, 130), cv2.FONT_HERSHEY_SIMPLEX, 0.6, camera_color, 1)
            
            # Add confidence meter
            conf_text = f"Confidence: {tracker_state['confidence']:.0f}%"
            cv2.putText(frame, conf_text, (20, 160), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
            
            # Encode frame
            ret, jpeg = cv2.imencode('.jpg', frame)
            frame_bytes = jpeg.tobytes()
            
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n\r\n')
    
    return Response(generate(), mimetype='multipart/x-mixed-replace; boundary=frame')

@socketio.on('connect')
def handle_connect():
    print('Client connected')
    emit('status', {'msg': 'Connected to workout tracker'})
    # Send current state
    emit('tracker_update', {
        'reps': tracker_state['reps'],
        'stage': tracker_state['stage'],
        'confidence': tracker_state['confidence'],
        'form_warnings': tracker_state['form_warnings']
    })

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

@socketio.on('set_exercise')
def handle_set_exercise(data):
    exercise_name = data.get('exercise', 'push_up')
    tracker_state['current_exercise'] = exercise_name.lower().replace(' ', '_')
    emit('exercise_set', {'exercise': tracker_state['current_exercise']})

if __name__ == '__main__':
    print("Starting Simple Workout Tracker Server...")
    print("Open http://localhost:5000 in your browser")
    print("Video feed available at http://localhost:5000/video_feed")
    print("Socket.IO server running on port 5000")
    
    # Start simulation thread
    sim_thread = threading.Thread(target=simulate_exercise_tracking, daemon=True)
    sim_thread.start()
    
    socketio.run(app, host='0.0.0.0', port=5000, debug=False)
