// REPLACE THIS CONFIG WITH YOUR OWN FROM FIREBASE SETTINGS
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "ai-nexus.firebaseapp.com",
  projectId: "ai-nexus",
  storageBucket: "ai-nexus.appspot.com",
  messagingSenderId: "...",
  appId: "..."
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
    await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
    statusBadge.innerText = "System Online";
}

// 2. Access Camera
async function startVideo() {
    navigator.mediaDevices.getUserMedia({ video: {} })
        .then(stream => video.srcObject = stream)
        .catch(err => console.error("Camera Error:", err));
}

// 3. REGISTRATION LOGIC
document.getElementById('register-btn').addEventListener('click', async () => {
    const name = document.getElementById('user-name').value;
    if (!name) return alert("Please enter a name first!");

    statusBadge.innerText = "Scanning face...";
    const detection = await faceapi.detectSingleFace(video).withFaceLandmarks().withFaceDescriptor();

    if (detection) {
        // Convert the face math (descriptor) into a normal list of numbers
        const faceArray = Array.from(detection.descriptor);
        
        // Save to Firebase Firestore
        await db.collection("users").add({
            name: name,
            descriptor: faceArray,
            hasEntered: false // Default to false
        });

        statusBadge.innerText = `Registered: ${name}`;
        statusBadge.className = "success";
        document.getElementById('user-name').value = ""; // Clear input
    } else {
        statusBadge.innerText = "No face detected. Try again.";
        statusBadge.className = "error";
    }
});

// 4. VERIFICATION LOGIC (Single Entry Check)
document.getElementById('verify-btn').addEventListener('click', async () => {
    statusBadge.innerText = "Verifying...";
    const detection = await faceapi.detectSingleFace(video).withFaceLandmarks().withFaceDescriptor();

    if (!detection) return alert("Please look at the camera.");

    // Fetch all registered users from Firebase
    const snapshot = await db.collection("users").get();
    let bestMatch = { name: "Unknown", distance: 1.0, id: null, hasEntered: false };

    snapshot.forEach(doc => {
        const userData = doc.data();
        // Math: Compare current face with stored face
        const distance = faceapi.euclideanDistance(detection.descriptor, userData.descriptor);
        
        // Threshold: 0.45 (lower is more strict)
        if (distance < 0.45 && distance < bestMatch.distance) {
            bestMatch = { name: userData.name, distance: distance, id: doc.id, hasEntered: userData.hasEntered };
        }
    });

    if (bestMatch.name !== "Unknown") {
        if (bestMatch.hasEntered) {
            statusBadge.innerText = `DENIED: ${bestMatch.name} has already entered!`;
            statusBadge.className = "error";
        } else {
            statusBadge.innerText = `APPROVED: Welcome, ${bestMatch.name}!`;
            statusBadge.className = "success";
            
            // UPDATE FIREBASE: Mark as entered so they can't come back
            await db.collection("users").doc(bestMatch.id).update({ hasEntered: true });
        }
    } else {
        statusBadge.innerText = "ACCESS DENIED: User not found.";
        statusBadge.className = "error";
    }
});

// Run everything
loadModels().then(startVideo);