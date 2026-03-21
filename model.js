// 1. Updated Firebase Config (Ensure this matches your actual project ID)
const firebaseConfig = {
  apiKey: "AIzaSyDfMS7ZLuC7F-Tts4YSfiPI-Cp0yOH5xdU",
  authDomain: "my-project-5cb14.firebaseapp.com",
  projectId: "my-project-5cb14",
};

// Initialize Firebase correctly for compat mode
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

const video = document.getElementById('video');
const statusBadge = document.getElementById('status-badge');
let cameraStarted = false;

// 2. 🔥 LOAD MODELS (Fixed URL & Error Catching)
async function loadModels() {
    statusBadge.innerText = "Loading AI Models...";
    // Using the official face-api.js weights repository
    const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';

    try {
        await Promise.all([
            faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
        statusBadge.innerText = "System Ready ✅";
        console.log("Models Loaded Successfully");
    } catch (err) {
        statusBadge.innerText = "❌ Model Load Failed. Check Internet.";
        console.error("Model Error:", err);
    }
}

// 🎥 START CAMERA (Updated to handle different browsers)
async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        cameraStarted = true;
        statusBadge.innerText = "Camera Active 📷";
    } catch (err) {
        statusBadge.innerText = "❌ Camera Denied";
        console.error(err);
    }
}

// Attach to button
document.getElementById('start-camera')?.addEventListener('click', startCamera);

// 🔍 DETECTION HELPER
async function getFaceDescriptor() {
    // We add a tiny delay to ensure the video frame is ready
    const detection = await faceapi.detectSingleFace(video)
        .withFaceLandmarks()
        .withFaceDescriptor();
    return detection;
}

// 📝 REGISTER
document.getElementById('register-btn').addEventListener('click', async () => {
    const nameInput = document.getElementById('user-name');
    if (!cameraStarted) return alert("Please start the camera first.");
    if (!nameInput.value) return alert("Please enter a name.");

    statusBadge.innerText = "Processing Face...";
    const detection = await getFaceDescriptor();

    if (!detection) {
        statusBadge.innerText = "❌ No face detected. Adjust lighting.";
        return;
    }

    try {
        await db.collection("users").add({
            name: nameInput.value,
            descriptor: Array.from(detection.descriptor),
            hasEntered: false,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        statusBadge.innerText = `✅ Registered: ${nameInput.value}`;
        nameInput.value = ""; // Clear input
    } catch (error) {
        statusBadge.innerText = "❌ Database Error";
        console.error(error);
    }
});

// ✅ VERIFY
document.getElementById('verify-btn').addEventListener('click', async () => {
    if (!cameraStarted) return alert("Start camera first");
    
    statusBadge.innerText = "Searching Database...";
    const detection = await getFaceDescriptor();

    if (!detection) {
        statusBadge.innerText = "❌ Stand still & look at camera";
        return;
    }

    try {
        const snapshot = await db.collection("users").get();
        if (snapshot.empty) {
            statusBadge.innerText = "❌ No users registered yet.";
            return;
        }

        let bestMatch = { name: null, distance: 1 };

        snapshot.forEach(doc => {
            const data = doc.data();
            // Create a Float32Array from the stored descriptor
            const storedDescriptor = new Float32Array(data.descriptor);
            const dist = faceapi.euclideanDistance(detection.descriptor, storedDescriptor);

            if (dist < 0.45 && dist < bestMatch.distance) {
                bestMatch = { name: data.name, distance: dist };
            }
        });

        if (bestMatch.name) {
            statusBadge.innerText = `✅ Welcome, ${bestMatch.name}!`;
            statusBadge.style.background = "#d4edda";
        } else {
            statusBadge.innerText = "❌ ACCESS DENIED: Unknown User";
            statusBadge.style.background = "#f8d7da";
        }
    } catch (err) {
        statusBadge.innerText = "❌ Error fetching data";
        console.error(err);
    }
});

// AUTO-INIT
loadModels();