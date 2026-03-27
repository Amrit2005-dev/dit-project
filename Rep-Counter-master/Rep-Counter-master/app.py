import tensorflow as tf
import cv2
import time
import argparse
import threading
from flask import Flask, Response, jsonify
from flask_cors import CORS

tf.compat.v1.disable_eager_execution()
import posenet
from run import countRepetition

app = Flask(__name__)
# Enable CORS so your React frontend can make requests to this API without issues
CORS(app)

# Global configuration from run.py arguments (simplified for the API)
MODEL = 101
CAM_ID = 0
CAM_WIDTH = 1280
CAM_HEIGHT = 720
SCALE_FACTOR = 0.7125

# Global variables for the API to access
global_count = 0
global_state_string = ''
global_frame = None
lock = threading.Lock()

def posenet_loop():
    global global_count, global_state_string, global_frame
    with tf.compat.v1.Session() as sess:
        model_cfg, model_outputs = posenet.load_model(MODEL, sess)
        output_stride = model_cfg['output_stride']

        cap = cv2.VideoCapture(CAM_ID)
        cap.set(3, CAM_WIDTH)
        cap.set(4, CAM_HEIGHT)
        
        previous_pose = '' 
        count = 0
        flag = -1
        current_state = [2,2]
        
        while True:
            # Get a frame, and get the model's prediction
            input_image, display_image, output_scale = posenet.read_cap(
                cap, scale_factor=SCALE_FACTOR, output_stride=output_stride)
                
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
                min_pose_score=0.4)
                
            keypoint_coords *= output_scale # Normalising the output against the resolution
            
            if(isinstance(previous_pose, str)): # if previous_pose was not inialised, assign the current keypoints to it
                previous_pose = keypoint_coords
            
            text, previous_pose, current_state, flag = countRepetition(previous_pose, keypoint_coords, current_state, flag)
            
            if(flag == 1):
                count += 1
                flag = -1
                
            image = posenet.draw_skel_and_kp(
                display_image, pose_scores, keypoint_scores, keypoint_coords,
                min_pose_score=0.4, min_part_score=0.1)
                
            # OpenCV does not recognise the use of \n delimeter
            y0, dy = 20, 20
            for i, line in enumerate(text.split('\n')):
                y = y0 + i*dy
                image = cv2.putText(image, line, (10, y), cv2.FONT_HERSHEY_SIMPLEX, .5, (255,255,255),1)

            image = cv2.putText(image, 'Count: ' + str(count), (10, y+20), cv2.FONT_HERSHEY_SIMPLEX, .5, (255,0,0),2)
            
            # Thread-safely update the globals so Flask can read them
            with lock:
                global_count = count
                global_state_string = text
                
                # Encode frame for MJPEG streaming
                ret, buffer = cv2.imencode('.jpg', image)
                if ret:
                    global_frame = buffer.tobytes()

        cap.release()

def generate_frames():
    """Generator function that continuously yields the latest frame for MJPEG streaming"""
    while True:
        with lock:
            if global_frame is None:
                continue
            frame = global_frame
        
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
        # adding a minor sleep prevents this generator from spinning too aggressively
        time.sleep(0.01)

@app.route('/video')
def video():
    """Endpoint serving the live video stream"""
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/data')
def data():
    """Endpoint returning JSON data for the current reps and exercise state"""
    with lock:
        reps = global_count
        state_text = global_state_string
    return jsonify({
        "reps": reps,
        "stage": state_text
    })

if __name__ == "__main__":
    # We want PoseNet to run continuously in the background while Flask serves requests
    t = threading.Thread(target=posenet_loop, daemon=True)
    t.start()
    
    # Run the flask application
    app.run(host='0.0.0.0', port=5000, debug=False)
