import React from 'react';
import { motion } from 'framer-motion';
import { routines } from '../data/exercises';

const RoutineSelector = ({ onSelectRoutine }) => {
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
          <div className="text-ai-accent text-sm font-semibold mb-2 font-poppins">
            STEP 1 OF 1
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 font-space neon-text">
            Choose Your Routine
          </h1>
          <p className="text-gray-300 text-lg font-inter">
            Your AI coach will personalise workouts based on your choice.
          </p>
        </motion.div>

        {/* Routine Cards */}
        <div className="grid md:grid-cols-2 gap-8">
          {Object.entries(routines).map(([key, routine], index) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onSelectRoutine(key, routine)}
              className="glassmorphism p-8 cursor-pointer neon-glow hover:neon-glow-lg transition-all duration-300"
            >
              {/* Routine Type Badge */}
              <div className="inline-block ai-gradient text-white text-xs font-semibold px-3 py-1 rounded-full mb-4 font-poppins">
                {routine.type}
              </div>

              {/* Routine Name */}
              <h2 className="text-2xl font-bold text-white mb-2 font-space">
                {routine.name}
              </h2>

              {/* Routine Description */}
              <p className="text-gray-300 mb-6 font-inter">
                {routine.description}
              </p>

              {/* Exercise Preview */}
              <div className="space-y-3">
                <div className="text-sm text-gray-400 font-semibold mb-2 font-poppins">
                  WORKOUT TYPES
                </div>
                {Object.entries(routine).map(([day, exercises]) => {
                  if (day === 'name' || day === 'type' || day === 'description') return null;
                  
                  return (
                    <div key={day} className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-ai-primary rounded-full" />
                      <div>
                        <div className="text-white font-semibold capitalize font-inter">
                          {day} Day
                        </div>
                        <div className="text-gray-400 text-sm font-inter">
                          {exercises.length} exercises
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Select Button */}
              <div className="mt-6 ai-gradient text-white text-center py-3 rounded-lg font-semibold font-poppins hover:opacity-90 transition-opacity">
                Select This Routine
              </div>
            </motion.div>
          ))}
        </div>

        {/* AI Badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="flex items-center justify-center mt-12 space-x-2"
        >
          <div className="w-3 h-3 bg-ai-primary rounded-full animate-pulse" />
          <span className="text-ai-primary text-sm font-semibold font-poppins">
            AI POWERED
          </span>
        </motion.div>
      </div>
    </div>
  );
};

export default RoutineSelector;
