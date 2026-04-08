import { calculateAngle, getKeypoint } from './poseDetection.js';

export class ExerciseDetector {
  constructor(exerciseType) {
    this.exerciseType = exerciseType;
    this.state = 'ready'; // ready, down, up, transitioning
    this.repCount = 0;
    this.lastState = 'ready';
    this.feedback = [];
    this.thresholds = this.getThresholds();
  }

  getThresholds() {
    const thresholds = {
      pushup: {
        downAngle: 90,
        upAngle: 160,
        hipThreshold: 0.15 // Hip should not be too high
      },
      squat: {
        downAngle: 90,
        upAngle: 160,
        kneeThreshold: 0.1 // Knees should not go too far forward
      },
      bicep_curl: {
        downAngle: 160,
        upAngle: 60,
        shoulderStability: 0.1 // Shoulders should be stable
      },
      pullup: {
        downAngle: 170,
        upAngle: 90,
        hipStability: 0.1 // Hips should be stable
      },
      shoulder_press: {
        downAngle: 90,
        upAngle: 160,
        backStability: 0.15 // Back should not arch too much
      },
      dip: {
        downAngle: 90,
        upAngle: 160,
        leanThreshold: 0.2 // Should not lean too far forward
      },
      plank: {
        hipThreshold: 0.1, // Hips should be level with shoulders
        backAlignment: 0.15, // Back should be straight
        shoulderStability: 0.1 // Shoulders should be stable
      },
      crunch: {
        shoulderLift: 0.3, // Shoulders should lift off ground
        hipStability: 0.2 // Hips should stay stable
      },
      russian_twist: {
        rotationAngle: 45, // Minimum rotation angle
        hipStability: 0.15 // Hips should stay stable
      },
      mountain_climber: {
        kneeLift: 0.4, // Knee should lift toward chest
        hipStability: 0.2 // Hips should stay level
      },
      bicycle_crunch: {
        kneeElbowDistance: 0.3, // Knee and elbow should come close
        rotationAngle: 30 // Minimum torso rotation
      }
    };

    return thresholds[this.exerciseType] || thresholds.pushup;
  }

  detect(landmarks) {
    if (!landmarks || landmarks.length === 0) {
      return { reps: this.repCount, feedback: 'No pose detected', state: this.state };
    }

    let detection = { reps: this.repCount, feedback: '', state: this.state };

    switch (this.exerciseType) {
      case 'pushup':
        detection = this.detectPushup(landmarks);
        break;
      case 'squat':
        detection = this.detectSquat(landmarks);
        break;
      case 'bicep_curl':
        detection = this.detectBicepCurl(landmarks);
        break;
      case 'pullup':
        detection = this.detectPullup(landmarks);
        break;
      case 'shoulder_press':
        detection = this.detectShoulderPress(landmarks);
        break;
      case 'dip':
        detection = this.detectDip(landmarks);
        break;
      case 'plank':
        detection = this.detectPlank(landmarks);
        break;
      case 'crunch':
        detection = this.detectCrunch(landmarks);
        break;
      case 'russian_twist':
        detection = this.detectRussianTwist(landmarks);
        break;
      case 'mountain_climber':
        detection = this.detectMountainClimber(landmarks);
        break;
      case 'bicycle_crunch':
        detection = this.detectBicycleCrunch(landmarks);
        break;
      default:
        detection = this.detectGeneric(landmarks);
        break;
    }

    return detection;
  }

  detectPushup(landmarks) {
    const leftShoulder = getKeypoint(landmarks, 'left_shoulder');
    const leftElbow = getKeypoint(landmarks, 'left_elbow');
    const leftWrist = getKeypoint(landmarks, 'left_wrist');
    const leftHip = getKeypoint(landmarks, 'left_hip');

    const rightShoulder = getKeypoint(landmarks, 'right_shoulder');
    const rightElbow = getKeypoint(landmarks, 'right_elbow');
    const rightWrist = getKeypoint(landmarks, 'right_wrist');
    const rightHip = getKeypoint(landmarks, 'right_hip');

    if (!leftShoulder || !leftElbow || !leftWrist || !leftHip) {
      return { reps: this.repCount, feedback: 'Position yourself fully in camera', state: this.state };
    }

    // Calculate elbow angles
    const leftAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
    const rightAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
    const avgAngle = (leftAngle + rightAngle) / 2;

    // Check hip position (should not be too high)
    const hipHeight = (leftHip.y + rightHip.y) / 2;
    const shoulderHeight = (leftShoulder.y + rightShoulder.y) / 2;
    const hipRatio = hipHeight - shoulderHeight;

    let feedback = '';

    // Form checks based only on angle to ensure reliable counting
    if (avgAngle < this.thresholds.downAngle && this.state !== 'down') {
      this.state = 'down';
      feedback = 'Good down position';
    } else if (avgAngle > this.thresholds.upAngle && this.state === 'down') {
      this.state = 'up';
      this.repCount++;
      feedback = 'Great rep! Keep going';
    } else if (this.state === 'ready') {
      feedback = 'Start your exercise';
    }

    if (hipRatio > this.thresholds.hipThreshold && this.state !== 'ready') {
      feedback = feedback ? feedback + ' (Lower your hips)' : 'Lower your hips';
    }

    return { reps: this.repCount, feedback, state: this.state };
  }

  detectSquat(landmarks) {
    const leftHip = getKeypoint(landmarks, 'left_hip');
    const leftKnee = getKeypoint(landmarks, 'left_knee');
    const leftAnkle = getKeypoint(landmarks, 'left_ankle');
    const rightHip = getKeypoint(landmarks, 'right_hip');
    const rightKnee = getKeypoint(landmarks, 'right_knee');
    const rightAnkle = getKeypoint(landmarks, 'right_ankle');

    if (!leftHip || !leftKnee || !leftAnkle) {
      return { reps: this.repCount, feedback: 'Position yourself fully in camera', state: this.state };
    }

    // Calculate knee angles
    const leftAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
    const rightAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
    const avgAngle = (leftAngle + rightAngle) / 2;

    let feedback = '';

    // Form checks
    if (avgAngle < this.thresholds.downAngle && this.state !== 'down') {
      this.state = 'down';
      feedback = 'Good squat depth';
    } else if (avgAngle > this.thresholds.upAngle && this.state === 'down') {
      this.state = 'up';
      this.repCount++;
      feedback = 'Great rep! Keep your chest up';
    } else if (this.state === 'ready') {
      feedback = 'Start your squat';
    } else if (avgAngle > this.thresholds.downAngle && avgAngle < this.thresholds.upAngle) {
      feedback = 'Go deeper';
    }

    return { reps: this.repCount, feedback, state: this.state };
  }

  detectBicepCurl(landmarks) {
    const leftShoulder = getKeypoint(landmarks, 'left_shoulder');
    const leftElbow = getKeypoint(landmarks, 'left_elbow');
    const leftWrist = getKeypoint(landmarks, 'left_wrist');

    if (!leftShoulder || !leftElbow || !leftWrist) {
      return { reps: this.repCount, feedback: 'Position yourself fully in camera', state: this.state };
    }

    // Calculate elbow angle
    const angle = calculateAngle(leftShoulder, leftElbow, leftWrist);

    let feedback = '';

    // Form checks
    if (angle < this.thresholds.upAngle && this.state !== 'up') {
      this.state = 'up';
      feedback = 'Good curl position';
    } else if (angle > this.thresholds.downAngle && this.state === 'up') {
      this.state = 'down';
      this.repCount++;
      feedback = 'Great rep! Control the movement';
    } else if (this.state === 'ready') {
      feedback = 'Start your bicep curl';
    }

    return { reps: this.repCount, feedback, state: this.state };
  }

  detectPullup(landmarks) {
    const leftShoulder = getKeypoint(landmarks, 'left_shoulder');
    const leftElbow = getKeypoint(landmarks, 'left_elbow');
    const leftWrist = getKeypoint(landmarks, 'left_wrist');

    if (!leftShoulder || !leftElbow || !leftWrist) {
      return { reps: this.repCount, feedback: 'Position yourself fully in camera', state: this.state };
    }

    // Calculate elbow angle
    const angle = calculateAngle(leftShoulder, leftElbow, leftWrist);

    let feedback = '';

    // Form checks
    if (angle < this.thresholds.upAngle && this.state !== 'up') {
      this.state = 'up';
      feedback = 'Good pull position';
    } else if (angle > this.thresholds.downAngle && this.state === 'up') {
      this.state = 'down';
      this.repCount++;
      feedback = 'Great rep! Full extension';
    } else if (this.state === 'ready') {
      feedback = 'Start your pull-up';
    }

    return { reps: this.repCount, feedback, state: this.state };
  }

  detectShoulderPress(landmarks) {
    const leftShoulder = getKeypoint(landmarks, 'left_shoulder');
    const leftElbow = getKeypoint(landmarks, 'left_elbow');
    const leftWrist = getKeypoint(landmarks, 'left_wrist');

    if (!leftShoulder || !leftElbow || !leftWrist) {
      return { reps: this.repCount, feedback: 'Position yourself fully in camera', state: this.state };
    }

    // Calculate elbow angle
    const angle = calculateAngle(leftShoulder, leftElbow, leftWrist);

    let feedback = '';

    // Form checks
    if (angle > this.thresholds.upAngle && this.state !== 'up') {
      this.state = 'up';
      feedback = 'Good press position';
    } else if (angle < this.thresholds.downAngle && this.state === 'up') {
      this.state = 'down';
      this.repCount++;
      feedback = 'Great rep! Control the movement';
    } else if (this.state === 'ready') {
      feedback = 'Start your shoulder press';
    }

    return { reps: this.repCount, feedback, state: this.state };
  }

  detectDip(landmarks) {
    const leftShoulder = getKeypoint(landmarks, 'left_shoulder');
    const leftElbow = getKeypoint(landmarks, 'left_elbow');
    const leftWrist = getKeypoint(landmarks, 'left_wrist');

    if (!leftShoulder || !leftElbow || !leftWrist) {
      return { reps: this.repCount, feedback: 'Position yourself fully in camera', state: this.state };
    }

    // Calculate elbow angle
    const angle = calculateAngle(leftShoulder, leftElbow, leftWrist);

    let feedback = '';

    // Form checks
    if (angle < this.thresholds.downAngle && this.state !== 'down') {
      this.state = 'down';
      feedback = 'Good dip position';
    } else if (angle > this.thresholds.upAngle && this.state === 'down') {
      this.state = 'up';
      this.repCount++;
      feedback = 'Great rep! Full extension';
    } else if (this.state === 'ready') {
      feedback = 'Start your dip';
    }

    return { reps: this.repCount, feedback, state: this.state };
  }

  detectPlank(landmarks) {
    const leftShoulder = getKeypoint(landmarks, 'left_shoulder');
    const leftHip = getKeypoint(landmarks, 'left_hip');
    const leftAnkle = getKeypoint(landmarks, 'left_ankle');
    const rightShoulder = getKeypoint(landmarks, 'right_shoulder');
    const rightHip = getKeypoint(landmarks, 'right_hip');
    const rightAnkle = getKeypoint(landmarks, 'right_ankle');

    if (!leftShoulder || !leftHip || !leftAnkle) {
      return { reps: this.repCount, feedback: 'Position yourself fully in camera', state: this.state };
    }

    // Check for straight line from shoulders to ankles
    const shoulderHeight = (leftShoulder.y + rightShoulder.y) / 2;
    const hipHeight = (leftHip.y + rightHip.y) / 2;
    const ankleHeight = (leftAnkle.y + rightAnkle.y) / 2;
    
    const hipAlignment = Math.abs(hipHeight - ((shoulderHeight + ankleHeight) / 2));
    
    let feedback = '';
    
    if (hipAlignment > this.thresholds.hipThreshold) {
      feedback = 'Keep your hips level - engage your core';
    } else if (this.state === 'ready') {
      this.state = 'holding';
      feedback = 'Great plank position - hold it steady!';
    } else if (this.state === 'holding') {
      feedback = 'Perfect form! Keep that core tight!';
    }

    return { reps: this.repCount, feedback, state: this.state };
  }

  detectCrunch(landmarks) {
    const leftShoulder = getKeypoint(landmarks, 'left_shoulder');
    const leftHip = getKeypoint(landmarks, 'left_hip');
    const rightShoulder = getKeypoint(landmarks, 'right_shoulder');
    const rightHip = getKeypoint(landmarks, 'right_hip');

    if (!leftShoulder || !leftHip) {
      return { reps: this.repCount, feedback: 'Position yourself fully in camera', state: this.state };
    }

    const shoulderHeight = (leftShoulder.y + rightShoulder.y) / 2;
    const hipHeight = (leftHip.y + rightHip.y) / 2;
    const shoulderLift = Math.abs(hipHeight - shoulderHeight);
    
    let feedback = '';

    if (shoulderLift > this.thresholds.shoulderLift && this.state !== 'up') {
      this.state = 'up';
      feedback = 'Great crunch!';
    } else if (shoulderLift < this.thresholds.shoulderLift * 0.5 && this.state === 'up') {
      this.state = 'down';
      this.repCount++;
      feedback = 'Good rep! Control the movement';
    } else if (this.state === 'ready') {
      feedback = 'Start your crunches';
    }

    return { reps: this.repCount, feedback, state: this.state };
  }

  detectRussianTwist(landmarks) {
    const leftShoulder = getKeypoint(landmarks, 'left_shoulder');
    const rightShoulder = getKeypoint(landmarks, 'right_shoulder');
    const leftHip = getKeypoint(landmarks, 'left_hip');
    const rightHip = getKeypoint(landmarks, 'right_hip');

    if (!leftShoulder || !rightShoulder || !leftHip) {
      return { reps: this.repCount, feedback: 'Position yourself fully in camera', state: this.state };
    }

    const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
    const hipCenter = (leftHip.x + rightHip.x) / 2;
    const shoulderCenter = (leftShoulder.x + rightShoulder.x) / 2;
    const rotation = Math.abs(shoulderCenter - hipCenter) / shoulderWidth;
    
    let feedback = '';

    if (rotation > this.thresholds.rotationAngle / 90 && this.state !== 'twisted') {
      this.state = 'twisted';
      feedback = 'Good twist!';
    } else if (rotation < this.thresholds.rotationAngle / 180 && this.state === 'twisted') {
      this.state = 'center';
      this.repCount++;
      feedback = 'Great rep! Keep rotating';
    } else if (this.state === 'ready') {
      feedback = 'Start your Russian twists';
    }

    return { reps: this.repCount, feedback, state: this.state };
  }

  detectMountainClimber(landmarks) {
    const leftShoulder = getKeypoint(landmarks, 'left_shoulder');
    const leftHip = getKeypoint(landmarks, 'left_hip');
    const leftKnee = getKeypoint(landmarks, 'left_knee');
    const rightKnee = getKeypoint(landmarks, 'right_knee');

    if (!leftShoulder || !leftHip || !leftKnee) {
      return { reps: this.repCount, feedback: 'Position yourself fully in camera', state: this.state };
    }

    const kneeLift = Math.abs(leftKnee.y - leftHip.y);
    const shoulderHeight = leftShoulder.y;
    
    let feedback = '';

    if (kneeLift > this.thresholds.kneeLift && this.state !== 'up') {
      this.state = 'up';
      feedback = 'Good knee drive!';
    } else if (kneeLift < this.thresholds.kneeLift * 0.5 && this.state === 'up') {
      this.state = 'down';
      this.repCount++;
      feedback = 'Great rep! Keep the pace';
    } else if (this.state === 'ready') {
      feedback = 'Start your mountain climbers';
    }

    return { reps: this.repCount, feedback, state: this.state };
  }

  detectBicycleCrunch(landmarks) {
    const leftShoulder = getKeypoint(landmarks, 'left_shoulder');
    const leftElbow = getKeypoint(landmarks, 'left_elbow');
    const leftKnee = getKeypoint(landmarks, 'left_knee');
    const rightKnee = getKeypoint(landmarks, 'right_knee');

    if (!leftShoulder || !leftElbow || !leftKnee) {
      return { reps: this.repCount, feedback: 'Position yourself fully in camera', state: this.state };
    }

    const elbowKneeDistance = Math.sqrt(
      Math.pow(leftElbow.x - rightKnee.x, 2) + 
      Math.pow(leftElbow.y - rightKnee.y, 2)
    );
    
    let feedback = '';

    if (elbowKneeDistance < this.thresholds.kneeElbowDistance && this.state !== 'up') {
      this.state = 'up';
      feedback = 'Good bicycle crunch!';
    } else if (elbowKneeDistance > this.thresholds.kneeElbowDistance * 2 && this.state === 'up') {
      this.state = 'down';
      this.repCount++;
      feedback = 'Great rep! Keep pedaling';
    } else if (this.state === 'ready') {
      feedback = 'Start your bicycle crunches';
    }

    return { reps: this.repCount, feedback, state: this.state };
  }

  detectGeneric(landmarks) {
    // Generic detection for other exercises
    return { reps: this.repCount, feedback: 'Exercise detection not implemented', state: this.state };
  }

  reset() {
    this.state = 'ready';
    this.repCount = 0;
    this.lastState = 'ready';
    this.feedback = [];
  }

  getExerciseTypeFromModel(modelName) {
    const modelMap = {
      'pushupModel': 'pushup',
      'squatModel': 'squat',
      'bicepModel': 'bicep_curl',
      'pullupModel': 'pullup',
      'shoulderPressModel': 'shoulder_press',
      'dipModel': 'dip',
      'benchPressModel': 'bench_press',
      'lateralRaiseModel': 'lateral_raise',
      'rowModel': 'row',
      'facePullModel': 'face_pull',
      'deadliftModel': 'deadlift',
      'tricepsExtensionModel': 'triceps_extension',
      'lungeModel': 'lunge',
      'legRaiseModel': 'leg_raise',
      'plankModel': 'plank',
      'crunchModel': 'crunch',
      'russianTwistModel': 'russian_twist',
      'mountainClimberModel': 'mountain_climber',
      'bicycleCrunchModel': 'bicycle_crunch'
    };

    return modelMap[modelName] || 'generic';
  }
}
