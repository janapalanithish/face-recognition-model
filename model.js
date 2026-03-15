const URL = "https://teachablemachine.withgoogle.com/models/3k23_bDk7/";
let model, webcam, labelContainer, maxPredictions;

// This list keeps track of who has already entered
let verifiedUsers = [];

// Wait for the button to be ready
document.getElementById("start-btn").addEventListener("click", init);

async function init() {
    const startBtn = document.getElementById("start-btn");
    const statusBadge = document.getElementById("status-badge");
    
    startBtn.style.display = "none";
    statusBadge.innerHTML = "Initializing AI...";

    const modelURL = URL + "model.json";
    const metadataURL = URL + "metadata.json";

    model = await tmImage.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();

    webcam = new tmImage.Webcam(350, 350, true); 
    await webcam.setup();
    await webcam.play();
    
    document.getElementById("webcam-container").appendChild(webcam.canvas);
    statusBadge.innerHTML = "System Ready: Scan Face";
    
    window.requestAnimationFrame(loop);
}

async function loop() {
    webcam.update();
    await predict();
    window.requestAnimationFrame(loop);
}

async function predict() {
    const prediction = await model.predict(webcam.canvas);
    const statusBadge = document.getElementById("status-badge");

    for (let i = 0; i < maxPredictions; i++) {
        const name = prediction[i].className;
        const probability = prediction[i].probability;

        // If high confidence (over 95%)
        if (probability > 0.95) {
            
            // Check if user is already in the "Verified" list
            if (verifiedUsers.includes(name)) {
                statusBadge.innerHTML = `ALREADY ENTERED: ${name}`;
                statusBadge.className = "access-denied";
            } 
            else if (name !== "Background" && name !== "Nothing") {
                statusBadge.innerHTML = `ACCESS GRANTED: ${name}`;
                statusBadge.className = "access-granted";
                
                // Add to list and update log
                verifiedUsers.push(name);
                addToLog(name);
            }
            return; // Exit loop once we find a match
        }
    }
}

function addToLog(name) {
    const logList = document.getElementById("log-list");
    const entry = document.createElement("li");
    const time = new Date().toLocaleTimeString();
    entry.innerHTML = `<strong>${name}</strong> - Entered at ${time}`;
    logList.prepend(entry); // Adds the newest entry to the top
}