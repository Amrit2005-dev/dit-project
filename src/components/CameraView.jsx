import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const CameraView = ({ exercise, onRepComplete, onFeedback, reps, targetReps }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);

  useEffect(() => {
    if (cameraActive) {
      startCamera();
    }
    
    return () => {
      stopCamera();
    };
  }, [cameraActive]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraError('');
        setIsDetecting(true);
      }
    } catch (error) {
      console.error('Camera access error:', error);
      setCameraError('Unable to access camera. Please check permissions.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsDetecting(false);
  };

  const toggleCamera = () => {
    setCameraActive(!cameraActive);
  };

  return (
    <div className="min-h-screen bg-ai-bg flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-ai-primary/20 to-ai-accent/20" />
      
      {/* Main content */}
      <div className="relative z-10 w-full max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 font-space neon-text">
            {exercise.name}
          </h1>
          <div className="flex items-center justify-center space-x-4">
            <div className="ai-gradient text-white text-sm font-semibold px-3 py-1 rounded-full font-poppins">
              AI DETECTION ACTIVE
            </div>
            <div className="text-ai-accent text-sm font-semibold font-poppins">
              {reps} / {targetReps} REPS
            </div>
          </div>
        </motion.div>

        {/* Camera Container */}
        <div className="grid md:grid-cols-3 gap-8">
          {/* Video Feed */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="md:col-span-2"
          >
            <div className="glassmorphism p-4 neon-glow">
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                {cameraActive ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    <canvas
                      ref={canvasRef}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    {/* Pose overlay indicators */}
                    <div className="absolute top-4 left-4">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${isDetecting ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`} />
                        <span className="text-white text-sm font-poppins">
                          {isDetecting ? 'Detecting' : 'Initializing'}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="text-6xl mb-4">📷</div>
                      <p className="text-gray-400 mb-4 font-inter">
                        Camera not active
                      </p>
                      <button
                        onClick={toggleCamera}
                        className="ai-gradient text-white px-6 py-3 rounded-lg font-semibold font-poppins hover:opacity-90 transition-opacity"
                      >
                        Start Camera
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Camera Controls */}
              {cameraActive && (
                <div className="flex items-center justify-between mt-4">
                  <button
                    onClick={toggleCamera}
                    className="text-gray-400 hover:text-white transition-colors font-inter"
                  >
                    Stop Camera
                  </button>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-green-500 text-sm font-poppins">LIVE</span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Stats & Feedback Panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-6"
          >
            {/* Rep Counter */}
            <div className="glassmorphism p-6">
              <h3 className="text-xl font-bold text-white mb-4 font-space">Rep Counter</h3>
              <div className="text-center">
                <div className="text-5xl font-bold ai-gradient-text font-space mb-2">
                  {reps}
                </div>
                <div className="text-gray-400 font-inter">
                  of {targetReps} reps
                </div>
                {/* Progress Bar */}
                <div className="mt-4 bg-gray-700 rounded-full h-2">
                  <motion.div
                    className="ai-gradient h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(reps / targetReps) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            </div>

            {/* AI Feedback */}
            <div className="glassmorphism p-6">
              <h3 className="text-xl font-bold text-white mb-4 font-space">AI Feedback</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-green-500 text-sm font-inter">Good form detected</span>
                </div>
                <div className="text-gray-300 text-sm font-inter">
                  Keep your back straight and maintain controlled movement
                </div>
              </div>
            </div>

            {/* Exercise Instructions */}
            <div className="glassmorphism p-6">
              <h3 className="text-xl font-bold text-white mb-4 font-space">Instructions</h3>
              <div className="space-y-3 text-gray-300 text-sm font-inter">
                <div className="flex items-start space-x-2">
                  <span>1.</span>
                  <span>Position yourself in front of the camera</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span>2.</span>
                  <span>Ensure your full body is visible</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span>3.</span>
                  <span>Perform {exercise.name.toLowerCase()} with proper form</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span>4.</span>
                  <span>AI will count reps automatically</span>
                </div>
              </div>
            </div>

            {/* End Exercise Button */}
            {reps >= targetReps && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
              >
                <button className="w-full ai-gradient text-white px-6 py-4 rounded-lg font-bold font-poppins hover:opacity-90 transition-opacity">
                  Exercise Complete! →
                </button>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Error Display */}
        {cameraError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 glassmorphism p-4 border border-red-500/50"
          >
            <p className="text-red-500 font-inter">{cameraError}</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default CameraView;
