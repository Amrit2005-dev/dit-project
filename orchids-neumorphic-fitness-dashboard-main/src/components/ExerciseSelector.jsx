import React from 'react';
import { motion } from 'framer-motion';

const ExerciseSelector = ({ routine, onSelectExercise, onBack }) => {
  const getTodayWorkout = () => {
    // Simple logic: alternate between workout types
    const workoutTypes = Object.keys(routine).filter(key => 
      key !== 'name' && key !== 'type' && key !== 'description'
    );
    return workoutTypes[0]; // For demo, always return first workout type
  };

  const todayWorkout = getTodayWorkout();
  const exercises = routine[todayWorkout];

  return (
    <div className="min-h-screen bg-ai-bg flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-ai-primary/20 to-ai-accent/20" />
      
      {/* Main content */}
      <div className="relative z-10 w-full max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          {/* Back Button */}
          <button
            onClick={onBack}
            className="absolute left-0 top-0 text-gray-400 hover:text-white transition-colors font-inter flex items-center space-x-2"
          >
            <span>←</span>
            <span>Back</span>
          </button>

          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 font-space neon-text">
            Today's Workout
          </h1>
          <div className="flex items-center justify-center space-x-4 mb-4">
            <div className="ai-gradient text-white text-sm font-semibold px-3 py-1 rounded-full font-poppins">
              {routine.name}
            </div>
            <div className="text-ai-accent text-sm font-semibold font-poppins">
              {todayWorkout.toUpperCase()} DAY
            </div>
          </div>
          <p className="text-gray-300 text-lg font-inter">
            {exercises.length} exercises ready to go
          </p>
        </motion.div>

        {/* Exercise List */}
        <div className="space-y-4">
          {exercises.map((exercise, index) => (
            <motion.div
              key={exercise.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              className="glassmorphism p-6 hover:neon-glow transition-all duration-300"
            >
              <div className="flex items-center justify-between">
                {/* Exercise Info */}
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="text-2xl">
                      {exercise.difficulty === 'beginner' && '🟢'}
                      {exercise.difficulty === 'intermediate' && '🟡'}
                      {exercise.difficulty === 'advanced' && '🔴'}
                    </div>
                    <h3 className="text-xl font-bold text-white font-space">
                      {exercise.name}
                    </h3>
                  </div>
                  <div className="flex items-center space-x-4 text-gray-300 font-inter">
                    <div className="flex items-center space-x-1">
                      <span>🎯</span>
                      <span>{exercise.reps} reps</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span>📊</span>
                      <span className="capitalize">{exercise.difficulty}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span>🤖</span>
                      <span>AI Detection</span>
                    </div>
                  </div>
                </div>

                {/* Start Button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onSelectExercise(exercise)}
                  className="ai-gradient text-white px-6 py-3 rounded-lg font-semibold font-poppins hover:opacity-90 transition-opacity whitespace-nowrap"
                >
                  Start Exercise
                </motion.button>
              </div>

              {/* Exercise Instructions */}
              <div className="mt-4 pt-4 border-t border-gray-700">
                <div className="text-sm text-gray-400 font-inter">
                  💡 AI will track your form and count reps automatically
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Start All Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center mt-8"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelectExercise(exercises[0])}
            className="glassmorphism border-2 border-ai-primary text-ai-primary px-8 py-4 rounded-lg font-bold font-poppins hover:bg-ai-primary/20 transition-all duration-300"
          >
            Start Full Workout →
          </motion.button>
        </motion.div>

        {/* AI Badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1 }}
          className="flex items-center justify-center mt-8 space-x-2"
        >
          <div className="w-3 h-3 bg-ai-primary rounded-full animate-pulse" />
          <span className="text-ai-primary text-sm font-semibold font-poppins">
            AI READY
          </span>
        </motion.div>
      </div>
    </div>
  );
};

export default ExerciseSelector;
