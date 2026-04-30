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

// 3. Register Face (With Duplicate Prevention)
registerBtn.addEventListener('click', async () => {
    const label = userNameInput.value;
    if (!label) {
        alert("Please enter a name first!");
        return;
    }

    statusBadge.innerText = "Scanning Face...";
    
    // Capture the face descriptor
    const detections = await faceapi.detectSingleFace(video)
        .withFaceLandmarks()
        .withFaceDescriptor();

    if (!detections) {
        statusBadge.innerText = "No Face Detected";
        return;
    }

    const currentDescriptor = detections.descriptor;

    try {
        // --- DUPLICATE CHECK LOGIC ---
        // Fetch existing users from Firebase 'users' collection
        const snapshot = await db.collection('users').get();
        let isDuplicate = false;
        let existingName = "";

        snapshot.forEach(doc => {
            const data = doc.data();
            // Convert saved array back to Float32Array for comparison
            const savedDescriptor = new Float32Array(Object.values(data.descriptor));
            
            // Calculate distance (Euclidean)
            const distance = faceapi.euclideanDistance(currentDescriptor, savedDescriptor);
            
            // 0.45 threshold (smaller = more strict match)
            if (distance < 0.45) { 
                isDuplicate = true;
                existingName = data.name;
            }
        });

        if (isDuplicate) {
            statusBadge.innerText = "Denied: Face Already Registered";
            statusBadge.style.background = "#dc3545"; // Red
            alert(`Registration Failed: This person is already registered as "${existingName}".`);
            return;
        }

        // --- SAVE NEW USER LOGIC ---
        await db.collection('users').add({
            name: label,
            descriptor: Array.from(currentDescriptor), // Arrays are safer for Firebase
            timestamp: new Date()
        });

        statusBadge.innerText = `Success: ${label} Registered!`;
        statusBadge.style.background = "#28a745"; // Green
        console.log("New descriptor saved for:", label);

    } catch (error) {
        console.error("Database Error:", error);
        statusBadge.innerText = "Database Error";
    }
});

// Initialize the models on page load
loadModels();