import React, { useState } from 'react';
import RoutineSelector from './components/RoutineSelector';
import ExerciseSelector from './components/ExerciseSelector';
import CameraView from './components/CameraView';

function AppSimple() {
  const [currentScreen, setCurrentScreen] = useState('routine');
  const [selectedRoutine, setSelectedRoutine] = useState(null);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [reps, setReps] = useState(0);

  const handleSelectRoutine = (routineKey, routine) => {
    setSelectedRoutine({ key: routineKey, data: routine });
    setCurrentScreen('exercise');
  };

  const handleSelectExercise = (exercise) => {
    setSelectedExercise(exercise);
    setCurrentScreen('camera');
    setReps(0);
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
            onRepComplete={() => setReps(reps + 1)}
            onFeedback={(feedback) => console.log(feedback)}
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

export default AppSimple;
