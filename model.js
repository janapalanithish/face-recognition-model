const firebaseConfig = {
  apiKey: "AIzaSyDfMS7ZLuC7F-Tts4YSfiPI-Cp0yOH5xdU",
  authDomain: "my-project-5cb14.firebaseapp.com",
  projectId: "my-project-5cb14",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const video = document.getElementById('video');
const statusBadge = document.getElementById('status-badge');

let cameraStarted = false;

// 🔥 FAST MODEL
async function loadModels() {
    statusBadge.innerText = "Loading Fast AI Model...";

    const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);

    statusBadge.innerText = "System Ready";
}

// CAMERA START
document.getElementById('start-camera').addEventListener('click', async () => {

    if (cameraStarted) return;

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });

        video.srcObject = stream;

        video.onloadedmetadata = () => {
            video.play();
        };

        cameraStarted = true;
        statusBadge.innerText = "Camera Active";

    } catch (err) {
        statusBadge.innerText = "Permission Denied";
    }
});

// REGISTER
document.getElementById('register-btn').addEventListener('click', async () => {

    if (!cameraStarted) return alert("Start camera first");

    const name = document.getElementById('user-name').value;
    if (!name) return alert("Enter name");

    statusBadge.innerText = "Scanning...";

    const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

    if (!detection) {
        statusBadge.innerText = "No face detected";
        return;
    }

    await db.collection("users").add({
        name,
        descriptor: Array.from(detection.descriptor),
        hasEntered: false
    });

    statusBadge.innerText = "Registered";
});

// VERIFY
document.getElementById('verify-btn').addEventListener('click', async () => {

    if (!cameraStarted) return alert("Start camera first");

    statusBadge.innerText = "Verifying...";

    const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

    if (!detection) {
        statusBadge.innerText = "No face detected";
        return;
    }

    const snapshot = await db.collection("users").get();

    let bestMatch = { distance: 1 };

    snapshot.forEach(doc => {
        const data = doc.data();

        const dist = faceapi.euclideanDistance(
            detection.descriptor,
            data.descriptor
        );

        if (dist < 0.5 && dist < bestMatch.distance) {
            bestMatch = { ...data, distance: dist };
        }
    });

    if (!bestMatch.name) {
        statusBadge.innerText = "Access Denied";
        return;
    }

    statusBadge.innerText = `Welcome ${bestMatch.name}`;
});

// INIT
loadModels();