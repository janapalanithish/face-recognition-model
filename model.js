// 1. Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyDfMS7ZLuC7F-Tts4YSfiPI-Cp0yOH5xdU",
  authDomain: "my-project-5cb14.firebaseapp.com",
  projectId: "my-project-5cb14",
};

// Initialize Firebase correctly
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

const video = document.getElementById('video');
const statusBadge = document.getElementById('status-badge');
let cameraStarted = false;

// 2. 🔥 THE BRAIN: Load Models
async function loadModels() {
    // Check if faceapi is even loaded in the browser yet
    if (typeof faceapi === 'undefined') {
        console.error("AI Library missing. Retrying in 1 second...");
        setTimeout(loadModels, 1000);
        return;
    }

    statusBadge.innerText = "Loading AI Brain...";
    const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';

    try {
        await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        statusBadge.innerText = "System Ready ✅";
        statusBadge.style.background = "#e8f0fe";
    } catch (err) {
        statusBadge.innerText = "❌ AI Models failed to load.";
        console.error(err);
    }
}

// 🎥 START CAMERA
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

// Connect buttons to code
document.getElementById('start-camera')?.addEventListener('click', startCamera);

// 🔍 DETECTION HELPER
async function getFaceDescriptor() {
    const detection = await faceapi.detectSingleFace(video)
        .withFaceLandmarks()
        .withFaceDescriptor();
    return detection;
}

// 📝 REGISTER
document.getElementById('register-btn')?.addEventListener('click', async () => {
    const nameInput = document.getElementById('user-name');
    if (!cameraStarted) return alert("Start camera first!");
    if (!nameInput || !nameInput.value) return alert("Enter a name!");

    statusBadge.innerText = "Scanning Face...";
    const detection = await getFaceDescriptor();

    if (!detection) {
        statusBadge.innerText = "❌ Face not found. Look at camera.";
        return;
    }

    try {
        await db.collection("users").add({
            name: nameInput.value,
            descriptor: Array.from(detection.descriptor),
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        statusBadge.innerText = `✅ Registered: ${nameInput.value}`;
        nameInput.value = ""; 
    } catch (error) {
        statusBadge.innerText = "❌ Database Error";
        console.error(error);
    }
});

// ✅ VERIFY
document.getElementById('verify-btn')?.addEventListener('click', async () => {
    if (!cameraStarted) return alert("Start camera first!");
    
    statusBadge.innerText = "Searching Database...";
    const detection = await getFaceDescriptor();

    if (!detection) {
        statusBadge.innerText = "❌ Look at the camera.";
        return;
    }

    try {
        const snapshot = await db.collection("users").get();
        let bestMatch = { name: null, distance: 1 };

        snapshot.forEach(doc => {
            const data = doc.data();
            const storedDescriptor = new Float32Array(data.descriptor);
            const dist = faceapi.euclideanDistance(detection.descriptor, storedDescriptor);

            if (dist < 0.45 && dist < bestMatch.distance) {
                bestMatch = { name: data.name, distance: dist };
            }
        });

        if (bestMatch.name) {
            statusBadge.innerText = `✅ Welcome, ${bestMatch.name}!`;
            statusBadge.className = "success-badge"; // Make sure you have this in CSS
            statusBadge.style.background = "#d4edda";
        } else {
            statusBadge.innerText = "❌ ACCESS DENIED";
            statusBadge.style.background = "#f8d7da";
        }
    } catch (err) {
        statusBadge.innerText = "❌ Error fetching data";
    }
});

// INITIALIZE ON LOAD
loadModels();