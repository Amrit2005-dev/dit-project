<div align="center">
  
# VisionFit 🏋️‍♂️👁️

**Advanced AI-powered workout tracker that uses computer vision to analyze and count your exercises in real-time.**

</div>

## Overview 🚀
VisionFit is an intelligent, locally-hosted fitness dashboard that actively watches and tracks your physical movements. Instead of relying on manual counters, VisionFit spins up your webcam and applies a sophisticated **TensorFlow PoseNet** backend engine to intelligently map your body's skeleton. 

Paired with a stunning, modern **Neumorphic React Dashboard**, VisionFit transforms your workouts by providing live rep counting, video playback, and persistent session saving.

## Key Features ✨
- **Live Skeletal Pose Tracking**: Intelligently maps key points on your body (shoulders, elbows, wrists) via a tailored TensorFlow implementation.
- **Automatic Rep Counting**: Algorithmically tracks the spatial deltas of movement states to dynamically count reps (identifying stage shifts between `UP` and `DOWN`).
- **Beautiful Neumorphic UI**: Designed with immersive dark modes, dynamic gradients, and smooth glowing accents utilizing React and Vite.
- **Socket.io Streaming**: The Python backend perfectly synchronizes with the frontend dashboard—effortlessly beaming realtime rep counts and confidence metrics directly to React via Websockets.
- **Permanent Progress Tracking (SQLite)**: Workouts are no longer fleeting! The backend automatically caches your completed reps and saves them to an on-disk `workouts.db` file so you can always view your past successes.

## Architecture & Stack 🛠️
- **Frontend**: React 19, Vite, Tailwind CSS, Socket.IO Client.
- **Backend / Tracking**: Python, Flask, Flask-CORS, Flask-SocketIO.
- **Machine Learning**: TensorFlow (v1.x backwards compatible engine via `posenet`), OpenCV 3.
- **Database**: SQLite3.

## Local Installation 💻

To get VisionFit's dual-engine system running locally, you need to spin up both the backend PoseNet server and the React frontend.

### 1. Launch the Backend
The Python server manages the webcam, loads the PoseNet TensorFlow models, and acts as the brains of the system.
```bash
# Navigate to the dashboard directory
cd orchids-neumorphic-fitness-dashboard-main

# Install dependencies (ensure you have Python installed)
pip install -r requirements.txt

# Start the tracker!
python server.py
```

### 2. Launch the Dashboard
The sleek React UI provides your control panel. Open a new terminal window:
```bash
# Navigate to the dashboard directory
cd orchids-neumorphic-fitness-dashboard-main

# Install Javascript dependencies
npm install

# Start the Vite development server!
npm run dev
```

Finally, open the provided local URL (usually `http://localhost:5173/`) in your browser to start your first workout!

---
*Developed with a focus on seamless hardware integration and stunning user experience.*