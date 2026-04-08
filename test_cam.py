import cv2
cap = cv2.VideoCapture(0)
if cap.isOpened():
    print("Camera opened successfully.")
    ret, frame = cap.read()
    if ret:
        print("Frame read successfully.")
    else:
        print("Failed to read frame.")
else:
    print("Failed to open camera.")

cap2 = cv2.VideoCapture(0, cv2.CAP_DSHOW)
if cap2.isOpened():
    print("Camera (DSHOW) opened successfully.")
else:
    print("Failed to open camera with DSHOW.")

cap.release()
cap2.release()
