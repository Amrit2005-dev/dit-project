import cv2
import mediapipe as mp
import numpy as np

class PullUpCounter:
    def __init__(self):
        self.mp_pose = mp.solutions.pose
        self.pose = self.mp_pose.Pose(
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        
        self.counter = 0
        self.stage = None
        self.bar_y = None
        
    def get_bounding_box(self, landmarks, indices, frame_shape):
        """Get bounding box for specific landmarks"""
        h, w = frame_shape[:2]
        points = []
        
        for idx in indices:
            lm = landmarks[idx]
            x, y = int(lm.x * w), int(lm.y * h)
            points.append([x, y])
        
        points = np.array(points)
        x, y, w_box, h_box = cv2.boundingRect(points)
        
        padding = 20
        x = max(0, x - padding)
        y = max(0, y - padding)
        w_box = w_box + 2 * padding
        h_box = h_box + 2 * padding
        
        return x, y, w_box, h_box
    
    def process_frame(self, frame):
        h, w = frame.shape[:2]
        
        image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        image.flags.writeable = False
        
        results = self.pose.process(image)
        
        image.flags.writeable = True
        image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
        
        try:
            if results.pose_landmarks:
                landmarks = results.pose_landmarks.landmark
                
                left_wrist = landmarks[self.mp_pose.PoseLandmark.LEFT_WRIST.value]
                right_wrist = landmarks[self.mp_pose.PoseLandmark.RIGHT_WRIST.value]
                nose = landmarks[self.mp_pose.PoseLandmark.NOSE.value]
                
                left_wrist_pos = (int(left_wrist.x * w), int(left_wrist.y * h))
                right_wrist_pos = (int(right_wrist.x * w), int(right_wrist.y * h))
                nose_pos = (int(nose.x * w), int(nose.y * h))
                
                self.bar_y = (left_wrist_pos[1] + right_wrist_pos[1]) // 2
                
                bar_start = (0, self.bar_y)
                bar_end = (w, self.bar_y)
                cv2.line(image, bar_start, bar_end, (0, 255, 0), 3)
                cv2.putText(image, 'Pulling Bar', 
                           (w//2 - 60, self.bar_y - 10),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2, cv2.LINE_AA)
                
                left_hand_indices = [
                    self.mp_pose.PoseLandmark.LEFT_WRIST.value,
                    self.mp_pose.PoseLandmark.LEFT_THUMB.value,
                    self.mp_pose.PoseLandmark.LEFT_PINKY.value,
                    self.mp_pose.PoseLandmark.LEFT_INDEX.value
                ]
                lh_x, lh_y, lh_w, lh_h = self.get_bounding_box(landmarks, left_hand_indices, frame.shape)
                
                right_hand_indices = [
                    self.mp_pose.PoseLandmark.RIGHT_WRIST.value,
                    self.mp_pose.PoseLandmark.RIGHT_THUMB.value,
                    self.mp_pose.PoseLandmark.RIGHT_PINKY.value,
                    self.mp_pose.PoseLandmark.RIGHT_INDEX.value
                ]
                rh_x, rh_y, rh_w, rh_h = self.get_bounding_box(landmarks, right_hand_indices, frame.shape)
                
                head_indices = [
                    self.mp_pose.PoseLandmark.NOSE.value,
                    self.mp_pose.PoseLandmark.LEFT_EYE.value,
                    self.mp_pose.PoseLandmark.RIGHT_EYE.value,
                    self.mp_pose.PoseLandmark.LEFT_EAR.value,
                    self.mp_pose.PoseLandmark.RIGHT_EAR.value
                ]
                head_x, head_y, head_w, head_h = self.get_bounding_box(landmarks, head_indices, frame.shape)
                
                cv2.rectangle(image, (lh_x, lh_y), (lh_x + lh_w, lh_y + lh_h), (255, 0, 0), 2)
                cv2.putText(image, 'Hand Left', 
                           (lh_x, lh_y - 10),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 0, 0), 2, cv2.LINE_AA)
                
                cv2.rectangle(image, (rh_x, rh_y), (rh_x + rh_w, rh_y + rh_h), (255, 0, 0), 2)
                cv2.putText(image, 'Hand Right', 
                           (rh_x, rh_y - 10),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 0, 0), 2, cv2.LINE_AA)
                
                cv2.rectangle(image, (head_x, head_y), (head_x + head_w, head_y + head_h), (0, 0, 255), 2)
                cv2.putText(image, 'Head', 
                           (head_x, head_y - 10),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2, cv2.LINE_AA)
                
                head_center_y = head_y + head_h // 2
                
                threshold = 50
                
                if head_center_y < (self.bar_y - threshold):
                    current_status = "UP"
                    if self.stage == "down":
                        self.counter += 1
                        print(f"Pull-up counted! Total: {self.counter}")
                    self.stage = "up"
                else:
                    current_status = "DOWN"
                    self.stage = "down"
                
                status_color = (0, 255, 0) if current_status == "UP" else (0, 165, 255)
                cv2.putText(image, current_status, 
                           (head_x + head_w + 10, head_y + head_h // 2),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.8, status_color, 2, cv2.LINE_AA)
                
        except Exception as e:
            print(f"Error: {e}")
        
        cv2.rectangle(image, (0, 0), (300, 120), (0, 0, 0), -1)
        cv2.putText(image, 'PULL-UP COUNTER', 
                   (10, 35),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2, cv2.LINE_AA)
        cv2.putText(image, f'Count: {self.counter}', 
                   (10, 80),
                   cv2.FONT_HERSHEY_SIMPLEX, 1.2, (255, 255, 255), 2, cv2.LINE_AA)
        
        if self.stage:
            cv2.putText(image, f'Stage: {self.stage.upper()}', 
                       (10, 110),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2, cv2.LINE_AA)
        
        return image
    
    def run(self):
        cap = cv2.VideoCapture(0)
        
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
        
        print("=" * 50)
        print("Pull-Up Counter Started!")
        print("=" * 50)
        print("Instructions:")
        print("- Position yourself so camera can see your hands and head")
        print("- Start from hanging position (arms extended)")
        print("- Pull up until head goes above hand level")
        print("- Lower down to complete one rep")
        print()
        print("Controls:")
        print("- Press 'q' to quit")
        print("- Press 'r' to reset counter")
        print("=" * 50)
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                print("Failed to grab frame")
                break
            
            frame = cv2.flip(frame, 1)
            
            output_frame = self.process_frame(frame)
            
            cv2.imshow('Pull-Up Counter', output_frame)
            
            key = cv2.waitKey(10) & 0xFF
            if key == ord('q'):
                break
            elif key == ord('r'):
                self.counter = 0
                self.stage = None
                print("Counter reset!")
        
        cap.release()
        cv2.destroyAllWindows()

if __name__ == "__main__":
    counter = PullUpCounter()
    counter.run()