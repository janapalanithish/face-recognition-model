const video = document.getElementById('video');
const startCameraBtn = document.getElementById('start-camera');
const registerBtn = document.getElementById('register-btn');
const verifyBtn = document.getElementById('verify-btn');
const statusBadge = document.getElementById('status-badge');
const userNameInput = document.getElementById('user-name');

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

// 3. Register Face (Strict Unique Verification)
registerBtn.addEventListener('click', async () => {
    const label = userNameInput.value.trim();
    if (!label) {
        alert("Please enter a name first!");
        return;
    }

    statusBadge.innerText = "Scanning Face...";
    statusBadge.style.background = "#ffc107";
    
    const detections = await faceapi.detectSingleFace(video)
        .withFaceLandmarks()
        .withFaceDescriptor();

    if (!detections) {
        statusBadge.innerText = "No Face Detected";
        return;
    }

    const currentDescriptor = detections.descriptor;

    try {
        // --- STEP 1: FETCH DATA ---
        const snapshot = await db.collection('users').get();

        // --- STEP 2: COMPARE (Using FOR...OF to allow real STOPPING) ---
        for (const doc of snapshot.docs) {
            const data = doc.data();
            const savedDescriptor = new Float32Array(Object.values(data.descriptor));
            const distance = faceapi.euclideanDistance(currentDescriptor, savedDescriptor);
            
            // 0.40 is strict - if distance is less, it's the same person
            if (distance < 0.40) { 
                statusBadge.innerText = "Registration Denied";
                statusBadge.style.background = "#dc3545"; // Red
                alert(`STOP: This face is already registered under the name: ${data.name}`);
                
                // THIS RETURN STOPS THE ENTIRE FUNCTION IMMEDIATELY
                return; 
            }
        }

        // --- STEP 3: SAVE ONLY IF LOOP FINISHED WITHOUT A MATCH ---
        await db.collection('users').add({
            name: label,
            descriptor: Array.from(currentDescriptor),
            timestamp: new Date()
        });

        statusBadge.innerText = `Welcome, ${label}! Registered.`;
        statusBadge.style.background = "#28a745"; // Green
        userNameInput.value = ""; 

    } catch (error) {
        console.error("Database Error:", error);
        statusBadge.innerText = "Connection Error";
    }
});

loadModels();