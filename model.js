// 1. UPDATE THESE WITH YOUR DETAILS FROM SUPABASE SETTINGS
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_KEY = 'YOUR_SUPABASE_ANON_KEY';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const video = document.getElementById('video');
const status = document.getElementById('status-badge');

// Load AI Models from CDN
async function loadModels() {
    status.innerText = "Loading AI Models...";
    const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
    await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
    status.innerText = "AI Ready";
}

// Start Video Stream
async function startVideo() {
    navigator.getUserMedia({ video: {} }, 
        stream => video.srcObject = stream, 
        err => console.error(err)
    );
}

// SECTOR 1: REGISTRATION LOGIC
document.getElementById('register-btn').addEventListener('click', async () => {
    const name = document.getElementById('user-name').value;
    if (!name) return alert("Please enter a name");

    status.innerText = "Capturing Face...";
    const detection = await faceapi.detectSingleFace(video).withFaceLandmarks().withFaceDescriptor();

    if (detection) {
        // Convert the 128 numbers (Float32Array) to a regular Array for Supabase
        const faceArray = Array.from(detection.descriptor);
        
        const { error } = await supabase.from('profiles').insert([
            { name: name, face_embedding: faceArray }
        ]);

        if (error) {
            status.innerText = "Error saving to Database";
        } else {
            status.innerText = "Registration Successful!";
            status.className = "success";
        }
    } else {
        alert("Face not detected. Try again.");
    }
});

// SECTOR 2: VERIFICATION LOGIC (The Scanner)
document.getElementById('verify-btn').addEventListener('click', async () => {
    status.innerText = "Scanning...";
    const detection = await faceapi.detectSingleFace(video).withFaceLandmarks().withFaceDescriptor();

    if (!detection) return alert("No face seen");

    // Get all registered faces from Supabase
    const { data: registeredUsers, error } = await supabase.from('profiles').select('*');

    let bestMatch = { name: "Unknown", distance: 1.0 };

    registeredUsers.forEach(user => {
        // Use Euclidean Distance to compare (lower is better)
        const dist = faceapi.euclideanDistance(detection.descriptor, user.face_embedding);
        if (dist < 0.45 && dist < bestMatch.distance) {
            bestMatch = { ...user, distance: dist };
        }
    });

    if (bestMatch.name !== "Unknown") {
        if (bestMatch.has_entered) {
            status.innerText = `CAUGHT! ${bestMatch.name} already entered!`;
            status.className = "error";
        } else {
            status.innerText = `WELCOME, ${bestMatch.name}!`;
            status.className = "success";
            // Mark as entered so they can't come back
            await supabase.from('profiles').update({ has_entered: true }).eq('id', bestMatch.id);
        }
    } else {
        status.innerText = "Access Denied: Unknown User";
        status.className = "error";
    }
});

// Run on load
loadModels().then(startVideo);