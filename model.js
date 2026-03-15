// Firebase Configuration using your project keys
const firebaseConfig = {
  apiKey: "AIzaSyDfMS7ZLuC7F-Tts4YSfiPI-Cp0yOH5xdU",
  authDomain: "my-project-5cb14.firebaseapp.com",
  projectId: "my-project-5cb14",
  storageBucket: "my-project-5cb14.firebasestorage.app",
  messagingSenderId: "744342131031",
  appId: "1:744342131031:web:34a1164e779b0faa6b6e12"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const video = document.getElementById('video');
const statusBadge = document.getElementById('status-badge');

// 1. Load Face-API Models from Web Links
async function loadModels() {
    statusBadge.innerText = "Loading AI Brain...";
    const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
    try {
        await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        statusBadge.innerText = "System Online";
    } catch (err) {
        statusBadge.innerText = "Error loading AI models.";
        console.error(err);
    }
}

// 2. Access Camera
async function startVideo() {
    navigator.mediaDevices.getUserMedia({ video: {} })
        .then(stream => video.srcObject = stream)
        .catch(err => {
            statusBadge.innerText = "Camera Access Denied";
            console.error(err);
        });
}

// 3. REGISTRATION LOGIC
document.getElementById('register-btn').addEventListener('click', async () => {
    const name = document.getElementById('user-name').value;
    if (!name) return alert("Please enter a name first!");

    statusBadge.innerText = "Scanning face...";
    const detection = await faceapi.detectSingleFace(video).withFaceLandmarks().withFaceDescriptor();

    if (detection) {
        const faceArray = Array.from(detection.descriptor);
        
        try {
            await db.collection("users").add({
                name: name,
                descriptor: faceArray,
                hasEntered: false
            });
            statusBadge.innerText = `Registered: ${name}`;
            statusBadge.className = "success";
            document.getElementById('user-name').value = "";
        } catch (error) {
            statusBadge.innerText = "Database Error. Check Rules.";
            console.error(error);
        }
    } else {
        statusBadge.innerText = "No face detected. Try again.";
        statusBadge.className = "error";
    }
});

// 4. VERIFICATION LOGIC
document.getElementById('verify-btn').addEventListener('click', async () => {
    statusBadge.innerText = "Verifying...";
    const detection = await faceapi.detectSingleFace(video).withFaceLandmarks().withFaceDescriptor();

    if (!detection) return alert("Please look at the camera.");

    const snapshot = await db.collection("users").get();
    let bestMatch = { name: "Unknown", distance: 1.0, id: null, hasEntered: false };

    snapshot.forEach(doc => {
        const userData = doc.data();
        const distance = faceapi.euclideanDistance(detection.descriptor, userData.descriptor);
        
        if (distance < 0.45 && distance < bestMatch.distance) {
            bestMatch = { name: userData.name, distance: distance, id: doc.id, hasEntered: userData.hasEntered };
        }
    });

    if (bestMatch.name !== "Unknown") {
        if (bestMatch.hasEntered) {
            statusBadge.innerText = `DENIED: ${bestMatch.name} already entered!`;
            statusBadge.className = "error";
        } else {
            statusBadge.innerText = `APPROVED: Welcome, ${bestMatch.name}!`;
            statusBadge.className = "success";
            await db.collection("users").doc(bestMatch.id).update({ hasEntered: true });
        }
    } else {
        statusBadge.innerText = "ACCESS DENIED: User not found.";
        statusBadge.className = "error";
    }
});

// Initialize
loadModels().then(startVideo);