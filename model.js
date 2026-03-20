// Firebase Config
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

// 🔥 LOAD SSD MODEL (ACCURATE)
async function loadModels() {
    statusBadge.innerText = "Loading AI Model...";

    const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

    await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);

    statusBadge.innerText = "System Ready";
}

// 🎥 START CAMERA
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
        statusBadge.innerText = "❌ Permission Denied";
        console.error(err);
    }
});

// 🔍 DETECTION FUNCTION (SSD)
async function getFaceDescriptor() {
    return await faceapi
        .detectSingleFace(video) // ✅ SSD default
        .withFaceLandmarks()
        .withFaceDescriptor();
}

// 📝 REGISTER
document.getElementById('register-btn').addEventListener('click', async () => {

    if (!cameraStarted) return alert("Start camera first");

    const name = document.getElementById('user-name').value;
    if (!name) return alert("Enter name");

    statusBadge.innerText = "Scanning face...";

    const detection = await getFaceDescriptor();

    if (!detection) {
        statusBadge.innerText = "❌ No face detected";
        return;
    }

    await db.collection("users").add({
        name,
        descriptor: Array.from(detection.descriptor),
        hasEntered: false
    });

    statusBadge.innerText = `✅ Registered: ${name}`;
    statusBadge.style.background = "#d4edda";
    statusBadge.style.color = "#155724";
});

// ✅ VERIFY (STRICT + ACCURATE)
document.getElementById('verify-btn').addEventListener('click', async () => {

    if (!cameraStarted) return alert("Start camera first");

    statusBadge.innerText = "Verifying...";

    const detection = await getFaceDescriptor();

    if (!detection) {
        statusBadge.innerText = "❌ No face detected";
        return;
    }

    const snapshot = await db.collection("users").get();

    let bestMatch = {
        name: null,
        distance: 1
    };

    snapshot.forEach(doc => {
        const data = doc.data();

        const dist = faceapi.euclideanDistance(
            detection.descriptor,
            data.descriptor
        );

        console.log("Distance:", dist); // DEBUG

        // 🔥 STRICT MATCH (SSD works best here)
        if (dist < 0.45 && dist < bestMatch.distance) {
            bestMatch = {
                name: data.name,
                distance: dist
            };
        }
    });

    if (!bestMatch.name) {
        statusBadge.innerText = "❌ ACCESS DENIED";
        statusBadge.style.background = "#f8d7da";
        statusBadge.style.color = "#721c24";
        return;
    }

    statusBadge.innerText = `✅ VERIFIED: ${bestMatch.name}`;
    statusBadge.style.background = "#d4edda";
    statusBadge.style.color = "#155724";
});

// INIT
loadModels();