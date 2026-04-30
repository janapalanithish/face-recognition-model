const video = document.getElementById('video');
const startCameraBtn = document.getElementById('start-camera');
const registerBtn = document.getElementById('register-btn');
const verifyBtn = document.getElementById('verify-btn');
const statusBadge = document.getElementById('status-badge');
const userNameInput = document.getElementById('user-name');

// 1. Load the AI Models from your 'models' folder
async function loadModels() {
    statusBadge.innerText = "Loading AI Models...";
    try {
        // These must match the files inside your /models folder
        await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
        await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
        statusBadge.innerText = "AI Ready";
        statusBadge.style.background = "#28a745"; // Green for ready
    } catch (err) {
        statusBadge.innerText = "Error loading models";
        console.error(err);
    }
}

// 2. Access the Webcam
startCameraBtn.addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
        video.srcObject = stream;
        statusBadge.innerText = "Camera Active";
    } catch (err) {
        statusBadge.innerText = "Camera Access Denied";
    }
});

// 3. Register Face (Extracting the Descriptor)
registerBtn.addEventListener('click', async () => {
    const label = userNameInput.value;
    if (!label) {
        alert("Please enter a name first!");
        return;
    }

    statusBadge.innerText = "Scanning Face...";
    const detections = await faceapi.detectSingleFace(video)
        .withFaceLandmarks()
        .withFaceDescriptor();

    if (detections) {
        // Here you would typically send detections.descriptor to your Firebase Firestore
        console.log("Descriptor found for:", label);
        console.log(detections.descriptor);
        statusBadge.innerText = `Registered: ${label}`;
    } else {
        statusBadge.innerText = "No Face Detected";
    }
});

// Start the loading process
loadModels();