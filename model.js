const URL = "https://teachablemachine.withgoogle.com/models/3k23_bDk7/";
let model, webcam, labelContainer, maxPredictions;

async function init() {
    document.getElementById("start-btn").style.display = "none";
    document.getElementById("status-badge").innerHTML = "Loading...";

    const modelURL = URL + "model.json";
    const metadataURL = URL + "metadata.json";

    model = await tmImage.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();

    webcam = new tmImage.Webcam(300, 300, true); 
    await webcam.setup();
    await webcam.play();
    
    document.getElementById("webcam-container").appendChild(webcam.canvas);
    
    labelContainer = document.getElementById("label-container");
    for (let i = 0; i < maxPredictions; i++) {
        const div = document.createElement("div");
        div.innerHTML = `<span>${model.getClassLabels()[i]}</span>
                         <div class="probability-bar"><div class="probability-fill" id="fill-${i}"></div></div>`;
        labelContainer.appendChild(div);
    }
    window.requestAnimationFrame(loop);
}

async function loop() {
    webcam.update();
    await predict();
    window.requestAnimationFrame(loop);
}

async function predict() {
    const prediction = await model.predict(webcam.canvas);
    let highConf = false;

    for (let i = 0; i < maxPredictions; i++) {
        const prob = prediction[i].probability;
        document.getElementById(`fill-${i}`).style.width = (prob * 100) + "%";

        if (prob > 0.90) {
            document.getElementById("status-badge").innerHTML = "Detected: " + prediction[i].className;
            document.getElementById("status-badge").classList.add("detected");
            highConf = true;
        }
    }

    if (!highConf) {
        document.getElementById("status-badge").innerHTML = "Scanning...";
        document.getElementById("status-badge").classList.remove("detected");
    }
}