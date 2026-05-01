const video = document.getElementById('video');
const startCameraBtn = document.getElementById('start-camera');
const registerBtn = document.getElementById('register-btn');
const verifyBtn = document.getElementById('verify-btn');
const statusBadge = document.getElementById('status-badge');
const userNameInput = document.getElementById('user-name');

// New variable to track who has entered during THIS specific session (until refresh)
let verifiedUsersInSession = [];

// 1. Load the AI Models
async function loadModels() {
    statusBadge.innerText = "Loading AI Models...";
    try {
        await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
        await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
        statusBadge.innerText = "AI Ready";
        statusBadge.style.background = "#28a745"; 
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

// 3. Register Face (Permanent Database Check)
registerBtn.addEventListener('click', async () => {
    const label = userNameInput.value.trim();
    if (!label) {
        alert("Please enter a name first!");
        return;
    }

    statusBadge.innerText = "Scanning Face...";
    statusBadge.style.background = "#ffc107";
    
    const detections = await faceapi.detectSingleFace(video).withFaceLandmarks().withFaceDescriptor();

    if (!detections) {
        statusBadge.innerText = "No Face Detected";
        return;
    }

    const currentDescriptor = detections.descriptor;

    try {
        const snapshot = await db.collection('users').get();

        // Check if this face already exists in the database
        for (const doc of snapshot.docs) {
            const data = doc.data();
            const savedDescriptor = new Float32Array(Object.values(data.descriptor));
            const distance = faceapi.euclideanDistance(currentDescriptor, savedDescriptor);
            
            if (distance < 0.40) { 
                statusBadge.innerText = "Registration Denied";
                statusBadge.style.background = "#dc3545";
                alert(`STOP: This face is already in the database as: ${data.name}`);
                return; 
            }
        }

        // Save new user
        await db.collection('users').add({
            name: label,
            descriptor: Array.from(currentDescriptor),
            timestamp: new Date()
        });

        statusBadge.innerText = `Success: ${label} Registered!`;
        statusBadge.style.background = "#28a745";
        userNameInput.value = ""; 

    } catch (error) {
        console.error("Database Error:", error);
        statusBadge.innerText = "Database Error";
    }
});

// 4. Verify Face (Session-Based Catching)
verifyBtn.addEventListener('click', async () => {
    statusBadge.innerText = "Verifying...";
    statusBadge.style.background = "#ffc107";

    const detections = await faceapi.detectSingleFace(video).withFaceLandmarks().withFaceDescriptor();

    if (!detections) {
        statusBadge.innerText = "No Face Detected";
        return;
    }

    const currentDescriptor = detections.descriptor;

    try {
        const snapshot = await db.collection('users').get();
        let matchFound = false;
        let matchedName = "";

        // Find who this person is
        for (const doc of snapshot.docs) {
            const data = doc.data();
            const savedDescriptor = new Float32Array(Object.values(data.descriptor));
            const distance = faceapi.euclideanDistance(currentDescriptor, savedDescriptor);

            if (distance < 0.40) { 
                matchFound = true;
                matchedName = data.name;
                break; 
            }
        }

        if (matchFound) {
            // Check if they already entered during this session
            if (verifiedUsersInSession.includes(matchedName)) {
                statusBadge.innerText = "DENIED: Already Verified";
                statusBadge.style.background = "#dc3545";
                alert(`Caught! ${matchedName}, you have already been verified once.`);
                return; 
            }

            // Success - First time entry
            statusBadge.innerText = `Welcome, ${matchedName}!`;
            statusBadge.style.background = "#28a745";
            verifiedUsersInSession.push(matchedName); // Log their name for this session

        } else {
            statusBadge.innerText = "Not Found in System";
            statusBadge.style.background = "#6c757d";
        }

    } catch (error) {
        console.error("Verification Error:", error);
        statusBadge.innerText = "System Error";
    }
});

loadModels();