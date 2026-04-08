#!/usr/bin/env python3
"""
PoseNet Server with Socket.IO
Bridges the old PoseNet run.py with Socket.IO for frontend
"""

import cv2
import time
import threading
import json
from flask import Flask, jsonify
from flask_socketio import SocketIO, emit
import sys
import os

# Add the current directory to Python path to import posenet
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), '_models'))

app = Flask(__name__)
app.config['SECRET_KEY'] = 'pose_tracker_secret'
socketio = SocketIO(app, cors_allowed_origins="*")

# Global state
rep_count = 0
stage = 'DOWN'
confidence = 0
is_running = False

def posenet_worker():
    """Worker thread to run PoseNet and emit Socket.IO events"""
    global rep_count, stage, confidence, is_running
    
    try:
        # Import here to avoid issues
        import tensorflow as tf
        import posenet
        
        tf.compat.v1.disable_eager_execution()
        
        # Initialize PoseNet
        with tf.compat.v1.Session() as sess:
            # Load model from _models directory
            model_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '_models', 'model-mobilenet_v1_101.pb')
            if not os.path.exists(model_path):
                print(f"Model file not found at: {model_path}")
                return
                
            model_cfg, model_outputs = posenet.load_model(101, sess)  # Use model 101
            output_stride = model_cfg['output_stride']
            
            cap = cv2.VideoCapture(0)  # Use default camera
            cap.set(3, 640)  # Width
            cap.set(4, 480)  # Height
            
            previous_pose = ''
            count = 0
            flag = -1
            current_state = [2, 2]
            
            print("PoseNet camera started...")
            
            while True:
                if not is_running:
                    time.sleep(0.1)
                    continue
                    
                ret, frame = cap.read()
                if not ret:
                    continue
                    
                # Process frame with PoseNet
                input_image, display_image, output_scale = posenet.read_cap(
                    cap, scale_factor=0.7125, output_stride=output_stride
                )
                
                heatmaps_result, offsets_result, displacement_fwd_result, displacement_bwd_result = sess.run(
                    model_outputs,
                    feed_dict={'image:0': input_image}
                )
                
                pose_scores, keypoint_scores, keypoint_coords = posenet.decode_multi.decode_multiple_poses(
                    heatmaps_result.squeeze(axis=0),
                    offsets_result.squeeze(axis=0),
                    displacement_fwd_result.squeeze(axis=0),
                    displacement_bwd_result.squeeze(axis=0),
                    output_stride=output_stride,
                    max_pose_detections=10,
                    min_pose_score=0.4
                )
                
                keypoint_coords *= output_scale
                
                if isinstance(previous_pose, str):
                    previous_pose = keypoint_coords
                
                # Count repetitions using the old method
                if len(keypoint_coords) > 0 and keypoint_coords[0][10][0] != 0 and keypoint_coords[0][10][1] != 0:
                    # Simple rep counting based on wrist movement
                    left_wrist_y = keypoint_coords[0][9][1]  # Left wrist
                    right_wrist_y = keypoint_coords[0][10][1]  # Right wrist
                    
                    # Detect up/down movement (simplified)
                    if len(previous_pose) > 0 and previous_pose[0][10][0] != 0:
                        prev_left_wrist_y = previous_pose[0][9][1]
                        prev_right_wrist_y = previous_pose[0][10][1]
                        
                        avg_current = (left_wrist_y + right_wrist_y) / 2
                        avg_previous = (prev_left_wrist_y + prev_right_wrist_y) / 2
                        
                        # Detect state change
                        if stage == 'DOWN' and avg_current < avg_previous - 30:
                            stage = 'UP'
                            confidence = min(95, confidence + 5)
                        elif stage == 'UP' and avg_current > avg_previous + 30:
                            stage = 'DOWN'
                            count += 1
                            rep_count = count
                            confidence = min(95, confidence + 5)
                            
                            # Emit Socket.IO event
                            socketio.emit('rep_update', {
                                'reps': rep_count,
                                'stage': stage,
                                'confidence': confidence
                            })
                    
                    previous_pose = keypoint_coords
                    
                    # Draw skeleton and info
                    display_image = posenet.draw_skel_and_kp(
                        display_image, pose_scores, keypoint_scores, keypoint_coords,
                        min_pose_score=0.4, min_part_score=0.1
                    )
                    
                    # Add text overlay
                    cv2.putText(display_image, f'Reps: {count}', (10, 30), 
                               cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
                    cv2.putText(display_image, f'Stage: {stage}', (10, 70), 
                               cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
                    cv2.putText(display_image, f'Conf: {confidence}%', (10, 110), 
                               cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
                    
                    # Show the frame
                    cv2.imshow('PoseNet Rep Counter', display_image)
                    
                    if cv2.waitKey(1) & 0xFF == ord('q'):
                        break
                        
                time.sleep(0.03)  # ~30 FPS
            
            cap.release()
            cv2.destroyAllWindows()
            
    except Exception as e:
        print(f"Error in PoseNet worker: {e}")
        import traceback
        traceback.print_exc()

@socketio.on('connect')
def handle_connect():
    print('Client connected')
    emit('status', {'msg': 'Connected to PoseNet backend'})

@socketio.on('start_exercise')
def handle_start_exercise(data):
    global is_running
    is_running = True
    print(f"Started exercise: {data}")

@socketio.on('stop_exercise')
def handle_stop_exercise():
    global is_running
    is_running = False
    print("Stopped exercise")

@app.route('/health')
def health_check():
    return jsonify({'status': 'ok', 'backend': 'posenet'})

if __name__ == '__main__':
    # Start PoseNet worker in background thread
    pose_thread = threading.Thread(target=posenet_worker)
    pose_thread.daemon = True
    pose_thread.start()
    
    # Start Flask-SocketIO server
    socketio.run(app, host='0.0.0.0', port=5000, debug=False)
