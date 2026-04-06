export const routines = {
  push_pull: {
    name: "Push / Pull Split",
    type: "2-Day Split",
    description: "10 exercises · 2 workout types",
    push: [
      { name: "Push Up", model: "pushupModel", reps: 12, difficulty: "beginner" },
      { name: "Bench Press", model: "benchPressModel", reps: 10, difficulty: "intermediate" },
      { name: "Shoulder Press", model: "shoulderPressModel", reps: 10, difficulty: "intermediate" },
      { name: "Triceps Dips", model: "dipModel", reps: 10, difficulty: "intermediate" },
      { name: "Lateral Raise", model: "lateralRaiseModel", reps: 12, difficulty: "beginner" }
    ],
    pull: [
      { name: "Pull Up", model: "pullupModel", reps: 8, difficulty: "advanced" },
      { name: "Barbell Row", model: "rowModel", reps: 10, difficulty: "intermediate" },
      { name: "Bicep Curl", model: "bicepModel", reps: 12, difficulty: "beginner" },
      { name: "Face Pull", model: "facePullModel", reps: 12, difficulty: "beginner" },
      { name: "Deadlift", model: "deadliftModel", reps: 8, difficulty: "advanced" }
    ]
  },
  upper_lower: {
    name: "Upper / Lower Split", 
    type: "4-Day Split",
    description: "9 exercises · 2 workout types",
    upper: [
      { name: "Bench Press", model: "benchPressModel", reps: 10, difficulty: "intermediate" },
      { name: "Pull Ups", model: "pullupModel", reps: 8, difficulty: "advanced" },
      { name: "Shoulder Press", model: "shoulderPressModel", reps: 10, difficulty: "intermediate" },
      { name: "Bicep Curl", model: "bicepModel", reps: 12, difficulty: "beginner" },
      { name: "Triceps Extension", model: "tricepsExtensionModel", reps: 12, difficulty: "beginner" }
    ],
    lower: [
      { name: "Squats", model: "squatModel", reps: 12, difficulty: "intermediate" },
      { name: "Lunges", model: "lungeModel", reps: 10, difficulty: "intermediate" },
      { name: "Deadlift", model: "deadliftModel", reps: 8, difficulty: "advanced" },
      { name: "Leg Raise", model: "legRaiseModel", reps: 12, difficulty: "beginner" }
    ]
  }
};

export const exerciseModels = {
  pushupModel: {
    name: "Push Up",
    keypoints: ["shoulders", "elbows", "wrists", "hips", "feet"],
    instructions: "Keep your back straight and lower your chest to the ground",
    feedback: {
      good: ["Great form!", "Keep it up!", "Perfect rep!"],
      bad: ["Lower your hips", "Keep your back straight", "Extend your arms fully"]
    }
  },
  squatModel: {
    name: "Squat",
    keypoints: ["hips", "knees", "ankles", "shoulders"],
    instructions: "Keep your chest up and lower until thighs are parallel to ground",
    feedback: {
      good: ["Great depth!", "Keep your chest up!", "Perfect squat!"],
      bad: ["Go lower", "Keep your back straight", "Don't let knees cave in"]
    }
  },
  bicepModel: {
    name: "Bicep Curl",
    keypoints: ["shoulders", "elbows", "wrists"],
    instructions: "Keep elbows tucked and curl weights to shoulders",
    feedback: {
      good: ["Great curl!", "Control the movement", "Perfect form!"],
      bad: ["Don't swing", "Keep elbows tucked", "Full range of motion"]
    }
  },
  pullupModel: {
    name: "Pull Up",
    keypoints: ["shoulders", "elbows", "wrists", "hips"],
    instructions: "Pull your chin above the bar with controlled movement",
    feedback: {
      good: ["Great pull!", "Full range of motion", "Strong rep!"],
      bad: ["Full extension", "Don't swing", "Engage your back"]
    }
  },
  benchPressModel: {
    name: "Bench Press",
    keypoints: ["shoulders", "elbows", "wrists"],
    instructions: "Lower bar to chest and press up with control",
    feedback: {
      good: ["Great press!", "Control the weight", "Perfect form!"],
      bad: ["Don't bounce", "Keep feet flat", "Full range of motion"]
    }
  },
  shoulderPressModel: {
    name: "Shoulder Press",
    keypoints: ["shoulders", "elbows", "wrists"],
    instructions: "Press overhead until arms are fully extended",
    feedback: {
      good: ["Great press!", "Keep core tight", "Perfect rep!"],
      bad: ["Don't arch back", "Full extension", "Control the movement"]
    }
  },
  dipModel: {
    name: "Triceps Dip",
    keypoints: ["shoulders", "elbows", "wrists", "hips"],
    instructions: "Lower until elbows are at 90 degrees and press back up",
    feedback: {
      good: ["Great dip!", "Full range", "Strong rep!"],
      bad: ["Don't lean too far", "Full extension", "Control the movement"]
    }
  },
  lateralRaiseModel: {
    name: "Lateral Raise",
    keypoints: ["shoulders", "elbows", "wrists"],
    instructions: "Raise arms to shoulder height with control",
    feedback: {
      good: ["Great raise!", "Control the movement", "Perfect form!"],
      bad: ["Don't swing", "Shoulder height only", "Slow and controlled"]
    }
  },
  rowModel: {
    name: "Barbell Row",
    keypoints: ["shoulders", "elbows", "wrists", "hips"],
    instructions: "Pull bar to lower chest and squeeze back muscles",
    feedback: {
      good: ["Great row!", "Squeeze your back", "Perfect form!"],
      bad: ["Don't round back", "Full range of motion", "Control the weight"]
    }
  },
  facePullModel: {
    name: "Face Pull",
    keypoints: ["shoulders", "elbows", "wrists"],
    instructions: "Pull rope to face height and squeeze shoulders",
    feedback: {
      good: ["Great pull!", "Squeeze shoulders", "Perfect rep!"],
      bad: ["Face height", "Don't lean back", "Control the movement"]
    }
  },
  deadliftModel: {
    name: "Deadlift",
    keypoints: ["shoulders", "hips", "knees", "ankles"],
    instructions: "Keep back straight and lift with legs and hips",
    feedback: {
      good: ["Great lift!", "Perfect form", "Strong rep!"],
      bad: ["Keep back straight", "Use your legs", "Don't round shoulders"]
    }
  },
  tricepsExtensionModel: {
    name: "Triceps Extension",
    keypoints: ["shoulders", "elbows", "wrists"],
    instructions: "Extend arms overhead and lower with control",
    feedback: {
      good: ["Great extension!", "Full range", "Perfect rep!"],
      bad: ["Don't swing", "Full extension", "Control the movement"]
    }
  },
  lungeModel: {
    name: "Lunge",
    keypoints: ["hips", "knees", "ankles", "shoulders"],
    instructions: "Step forward and lower until back knee nearly touches ground",
    feedback: {
      good: ["Great lunge!", "Perfect depth", "Good balance!"],
      bad: ["Don't let knee cave", "Upright torso", "Control the movement"]
    }
  },
  legRaiseModel: {
    name: "Leg Raise",
    keypoints: ["hips", "legs"],
    instructions: "Raise legs to 90 degrees while keeping lower back on ground",
    feedback: {
      good: ["Great raise!", "Control the movement", "Perfect form!"],
      bad: ["Don't arch back", "Slow and controlled", "Full range of motion"]
    }
  }
};
