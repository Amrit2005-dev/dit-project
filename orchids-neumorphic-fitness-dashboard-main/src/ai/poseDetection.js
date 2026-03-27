import { Pose } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';

export class PoseDetector {
  constructor(videoElement, canvasElement, onResults) {
    this.videoElement = videoElement;
    this.canvasElement = canvasElement;
    this.canvasCtx = canvasElement.getContext('2d');
    this.onResults = onResults;
    this.camera = null;
    this.pose = null;
    
    this.setupPose();
  }

  setupPose() {
    this.pose = new Pose({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
      }
    });

    this.pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    this.pose.onResults((results) => this.onPoseResults(results));
  }

  async startCamera() {
    if (!this.camera) {
      this.camera = new Camera(this.videoElement, {
        onFrame: async () => {
          await this.pose.send({ image: this.videoElement });
        },
        width: 1280,
        height: 720
      });
    }
    
    await this.camera.start();
  }

  stopCamera() {
    if (this.camera) {
      this.camera.stop();
    }
  }

  onPoseResults(results) {
    // Clear canvas
    this.canvasCtx.save();
    this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
    
    // Draw the video frame
    this.canvasCtx.drawImage(results.image, 0, 0, this.canvasElement.width, this.canvasElement.height);
    
    // Draw pose landmarks
    if (results.poseLandmarks) {
      this.drawConnectors(results.poseLandmarks);
      this.drawLandmarks(results.poseLandmarks);
    }
    
    this.canvasCtx.restore();
    
    // Send results to callback
    this.onResults(results);
  }

  drawConnectors(landmarks) {
    const connections = [
      // Face
      [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8],
      // Upper body
      [9, 10], [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
      // Lower body
      [11, 23], [12, 24], [23, 24], [23, 25], [24, 26], [25, 27], [26, 28],
      [27, 29], [28, 30], [29, 31], [30, 32], [27, 31], [28, 32]
    ];

    this.canvasCtx.strokeStyle = '#6C5CE7';
    this.canvasCtx.lineWidth = 3;

    connections.forEach(([start, end]) => {
      if (landmarks[start] && landmarks[end]) {
        const startPoint = landmarks[start];
        const endPoint = landmarks[end];
        
        this.canvasCtx.beginPath();
        this.canvasCtx.moveTo(startPoint.x * this.canvasElement.width, startPoint.y * this.canvasElement.height);
        this.canvasCtx.lineTo(endPoint.x * this.canvasElement.width, endPoint.y * this.canvasElement.height);
        this.canvasCtx.stroke();
      }
    });
  }

  drawLandmarks(landmarks) {
    this.canvasCtx.fillStyle = '#FF2E63';
    
    landmarks.forEach((landmark) => {
      this.canvasCtx.beginPath();
      this.canvasCtx.arc(
        landmark.x * this.canvasElement.width,
        landmark.y * this.canvasElement.height,
        5, 0, 2 * Math.PI
      );
      this.canvasCtx.fill();
    });
  }
}

export function calculateAngle(pointA, pointB, pointC) {
  // Calculate angle between three points
  const radians = Math.atan2(pointC.y - pointB.y, pointC.x - pointB.x) - 
                  Math.atan2(pointA.y - pointB.y, pointA.x - pointB.x);
  let angle = Math.abs(radians * 180.0 / Math.PI);
  
  if (angle > 180.0) {
    angle = 360 - angle;
  }
  
  return angle;
}

export function getKeypoint(landmarks, keypointName) {
  const keypointMap = {
    'nose': 0,
    'left_eye_inner': 1, 'left_eye': 2, 'left_eye_outer': 3,
    'right_eye_inner': 4, 'right_eye': 5, 'right_eye_outer': 6,
    'left_ear': 7, 'right_ear': 8,
    'mouth_left': 9, 'mouth_right': 10,
    'left_shoulder': 11, 'right_shoulder': 12,
    'left_elbow': 13, 'right_elbow': 14,
    'left_wrist': 15, 'right_wrist': 16,
    'left_pinky': 17, 'right_pinky': 18,
    'left_index': 19, 'right_index': 20,
    'left_thumb': 21, 'right_thumb': 22,
    'left_hip': 23, 'right_hip': 24,
    'left_knee': 25, 'right_knee': 26,
    'left_ankle': 27, 'right_ankle': 28,
    'left_heel': 29, 'right_heel': 30,
    'left_foot_index': 31, 'right_foot_index': 32
  };
  
  const index = keypointMap[keypointName];
  return index !== undefined ? landmarks[index] : null;
}
