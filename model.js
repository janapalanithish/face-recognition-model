// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDfMS7ZLuC7F-Tts4YSfiPI-Cp0yOH5xdU",
  authDomain: "my-project-5cb14.firebaseapp.com",
  projectId: "my-project-5cb14",
  storageBucket: "my-project-5cb14.firebasestorage.app",
  messagingSenderId: "744342131031",
  appId: "1:744342131031:web:34a1164e779b0faa6b6e12"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const video = document.getElementById('video');
const statusBadge = document.getElementById('status-badge');

let cameraStarted = false; // ✅ control flag

// 1. Load Models
async function loadModels() {
    statusBadge.innerText = "Loading AI Models...";
    const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';

    try {
        await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);

        statusBadge.innerText = "System Ready";
    } catch (err) {
        statusBadge.innerText = "Error loading AI models";
        console.error(err);
    }
}

// 2. Start Camera ONLY when needed
async function startVideo() {
    if (cameraStarted) return;

    statusBadge.innerText = "Starting Camera...";

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        cameraStarted = true;

        statusBadge.innerText = "Camera Active";
    } catch (err) {
        statusBadge.innerText = "Camera Access Denied";
        console.error(err);
    }
}

// 3. REGISTER FACE
document.getElementById('register-btn').addEventListener('click', async () => {

    await startVideo(); // ✅ ensures camera starts

    const name = document.getElementById('user-name').value;
    if (!name) return alert("Enter your name first");

    statusBadge.innerText = "Scanning face...";

    const detection = await faceapi
        .detectSingleFace(video)
        .withFaceLandmarks()
        .withFaceDescriptor();

    if (!detection) {
        statusBadge.innerText = "No face detected";
        statusBadge.className = "error";
        return;
    }

    const faceArray = Array.from(detection.descriptor);

    try {
        await db.collection("users").add({
            name,
            descriptor: faceArray,
            hasEntered: false
        });

        statusBadge.innerText = `Registered: ${name}`;
        statusBadge.className = "success";
        document.getElementById('user-name').value = "";

    } catch (error) {
        statusBadge.innerText = "Database error";
        console.error(error);
    }
});

// 4. VERIFY FACE
document.getElementById('verify-btn').addEventListener('click', async () => {

    await startVideo(); // ✅ ensures camera starts

    statusBadge.innerText = "Verifying...";

    const detection = await faceapi
        .detectSingleFace(video)
        .withFaceLandmarks()
        .withFaceDescriptor();

    if (!detection) {
        statusBadge.innerText = "No face detected";
        statusBadge.className = "error";
        return;
    }

    const snapshot = await db.collection("users").get();

    let bestMatch = {
        name: "Unknown",
        distance: 1.0,
        id: null,
        hasEntered: false
    };

    snapshot.forEach(doc => {
        const user = doc.data();
        const distance = faceapi.euclideanDistance(
            detection.descriptor,
            user.descriptor
        );

        if (distance < 0.45 && distance < bestMatch.distance) {
            bestMatch = {
                name: user.name,
                distance,
                id: doc.id,
                hasEntered: user.hasEntered
            };
        }
    });

    if (bestMatch.name === "Unknown") {
        statusBadge.innerText = "ACCESS DENIED";
        statusBadge.className = "error";
        return;
    }

    if (bestMatch.hasEntered) {
        statusBadge.innerText = `DENIED: ${bestMatch.name} already entered`;
        statusBadge.className = "error";
        return;
    }

    statusBadge.innerText = `APPROVED: Welcome ${bestMatch.name}`;
    statusBadge.className = "success";

    await db.collection("users").doc(bestMatch.id).update({
        hasEntered: true
    });
});

// INIT
loadModels();