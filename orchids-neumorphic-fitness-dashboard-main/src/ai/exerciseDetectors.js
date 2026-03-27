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

    // Form checks
    if (hipRatio > this.thresholds.hipThreshold) {
      feedback = 'Lower your hips - keep your back straight';
    } else if (avgAngle < this.thresholds.downAngle && this.state !== 'down') {
      this.state = 'down';
      feedback = 'Good down position';
    } else if (avgAngle > this.thresholds.upAngle && this.state === 'down') {
      this.state = 'up';
      this.repCount++;
      feedback = 'Great rep! Keep going';
    } else if (this.state === 'ready') {
      feedback = 'Start your push-up';
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
      'legRaiseModel': 'leg_raise'
    };

    return modelMap[modelName] || 'generic';
  }
}
