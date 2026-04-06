import React, { useState, useRef, useEffect } from 'react';
import RoutineSelector from './components/RoutineSelector';
import ExerciseSelector from './components/ExerciseSelector';
import CameraView from './components/CameraView';
import { PoseDetector } from './ai/poseDetection';
import { ExerciseDetector } from './ai/exerciseDetectors';

function AppAI() {
  const [currentScreen, setCurrentScreen] = useState('routine');
  const [selectedRoutine, setSelectedRoutine] = useState(null);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [reps, setReps] = useState(0);
  const [feedback, setFeedback] = useState('');
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const poseDetectorRef = useRef(null);
  const exerciseDetectorRef = useRef(null);

  useEffect(() => {
    if (currentScreen === 'exercise' && selectedExercise) {
      // Initialize pose detection
      if (videoRef.current && canvasRef.current && !poseDetectorRef.current) {
        poseDetectorRef.current = new PoseDetector(
          videoRef.current,
          canvasRef.current,
          handlePoseResults
        );
        
        // Initialize exercise detector
        exerciseDetectorRef.current = new ExerciseDetector(
          selectedExercise.model.replace('Model', '').toLowerCase()
        );
      }
    }
  }, [currentScreen, selectedExercise]);

  const handlePoseResults = (results) => {
    if (exerciseDetectorRef.current && results.poseLandmarks) {
      const detection = exerciseDetectorRef.current.detect(results.poseLandmarks);
      setReps(detection.reps);
      setFeedback(detection.feedback);
    }
  };

  const handleSelectRoutine = (routineKey, routine) => {
    setSelectedRoutine({ key: routineKey, data: routine });
    setCurrentScreen('exercise');
  };

  const handleSelectExercise = (exercise) => {
    setSelectedExercise(exercise);
    setCurrentScreen('camera');
    setReps(0);
    setFeedback('');
  };

  const handleBack = () => {
    if (currentScreen === 'exercise') {
      setCurrentScreen('routine');
    } else if (currentScreen === 'camera') {
      setCurrentScreen('exercise');
    }
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'routine':
        return <RoutineSelector onSelectRoutine={handleSelectRoutine} />;
      
      case 'exercise':
        return selectedRoutine ? (
          <ExerciseSelector
            routine={selectedRoutine.data}
            onSelectExercise={handleSelectExercise}
            onBack={handleBack}
          />
        ) : null;
      
      case 'camera':
        return selectedExercise ? (
          <CameraView
            exercise={selectedExercise}
            reps={reps}
            targetReps={selectedExercise.reps}
            onRepComplete={() => console.log('Rep completed')}
            onFeedback={setFeedback}
          />
        ) : null;
      
      default:
        return <RoutineSelector onSelectRoutine={handleSelectRoutine} />;
    }
  };

  return (
    <div className="App">
      {renderScreen()}
    </div>
  );
}

export default AppAI;
