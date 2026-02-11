const canvas = document.getElementById("digitCanvas");
const ctx = canvas.getContext("2d");


let drawing = false;

// Set white background
ctx.fillStyle = "white";
ctx.fillRect(0, 0, canvas.width, canvas.height);

// Drawing settings
ctx.lineWidth = 15;
ctx.lineCap = "round";
ctx.lineJoin = "round";
ctx.strokeStyle = "black";

// Get accurate mouse position
function getMousePos(event) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (event.clientX - rect.left) * (canvas.width / rect.width),
        y: (event.clientY - rect.top) * (canvas.height / rect.height)
    };
}

// Start drawing when mouse is pressed
canvas.addEventListener("mousedown", (event) => {
    drawing = true;
    const pos = getMousePos(event);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
});

// Draw only when mouse is pressed
canvas.addEventListener("mousemove", (event) => {
    if (!drawing) return;
    const pos = getMousePos(event);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
});

// Stop drawing when mouse released
canvas.addEventListener("mouseup", () => {
    drawing = false;
    ctx.beginPath();
});

// Stop drawing if mouse leaves canvas
canvas.addEventListener("mouseleave", () => {
    drawing = false;
    ctx.beginPath();
});



// Clear canvas
function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}



// Check if canvas is empty
function isCanvasEmpty() {
    const pixelBuffer = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

    for (let i = 0; i < pixelBuffer.length; i += 4) {
        // check if any pixel is NOT white
        if (
            pixelBuffer[i] !== 255 ||   // R
            pixelBuffer[i + 1] !== 255 || // G
            pixelBuffer[i + 2] !== 255    // B
        ) {
            return false;
        }
    }
    return true;
}



// Upload image preview
function previewImage(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function () {
        const img = new Image();
        img.onload = function () {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = reader.result;
    };
    reader.readAsDataURL(file);
}



async function loadHistory() {
    const response = await fetch("/history");
    const data = await response.json();

    const historyContainer = document.getElementById("history-container");
    historyContainer.innerHTML = "";

    if (data.history.length === 0) {
        historyContainer.innerHTML =
            `<p class="text-muted text-center">No predictions yet</p>`;
        return;
    }

    data.history.forEach(item => {
        const historyItem = document.createElement("div");
        historyItem.className = "history-item";

        historyItem.innerHTML = `
            <span>Digit: <strong>${item[0]}</strong></span>
            <span>${(item[1] * 100).toFixed(2)}%</span>
        `;

        historyContainer.appendChild(historyItem);
    });
}




function addToHistory(digit, confidence) {
    const historyContainer = document.getElementById("history-container");

    // Remove "No predictions yet" text
    if (historyContainer.children.length === 1 &&
        historyContainer.children[0].classList.contains("text-muted")) {
        historyContainer.innerHTML = "";
    }

    const historyItem = document.createElement("div");
    historyItem.className = "history-item";

    historyItem.innerHTML = `
        <span>Digit: <strong>${digit}</strong></span>
        <span>${(confidence * 100).toFixed(2)}%</span>
    `;

    historyContainer.prepend(historyItem);
}






// async function predictDigit() {
//     canvas.toBlob(async function (blob) {
//         const formData = new FormData();
//         formData.append("file", blob, "digit.png");

//         try {
//             const response = await fetch("/predict", {
//                 method: "POST",
//                 body: formData
//             });

//             const data = await response.json();

//             document.getElementById("predicted-digit").innerText = data.digit;
//             document.getElementById("confidence-text").innerText =
//                 `Confidence: ${(data.confidence * 100).toFixed(2)}%`;



//             /* ADD THIS */
//             addToHistory(data.digit, data.confidence);



//         } catch (error) {
//             console.error("Error predicting digit:", error);
//         }
//     }, "image/png");
// }






async function predictDigit() {

    // 🚫 STOP if canvas is empty
    if (isCanvasEmpty()) {
        alert("Please draw or upload a digit before predicting!");
        return;
    }

    canvas.toBlob(async function (blob) {
        const formData = new FormData();
        formData.append("file", blob, "digit.png");

        try {
            const response = await fetch("/predict", {
                method: "POST",
                body: formData
            });

            const data = await response.json();

            document.getElementById("predicted-digit").innerText = data.digit;
            document.getElementById("confidence-text").innerText =
                `Confidence: ${(data.confidence * 100).toFixed(2)}%`;

            addToHistory(data.digit, data.confidence);

        } catch (error) {
            console.error("Error predicting digit:", error);
        }
    }, "image/png");
}



function clearHistory() {
    const historyContainer = document.getElementById("history-container");
    historyContainer.innerHTML = `<p class="text-muted text-center">No predictions yet</p>`;
}


async function clearHistory() {
    const response = await fetch("/clear_history", {
        method: "DELETE"
    });

    if (response.ok) {
        const historyContainer = document.getElementById("history-container");
        historyContainer.innerHTML = `<p class="text-muted text-center">No predictions yet</p>`;
        alert("History cleared!");
    } else {
        alert("Failed to clear history");
    }
}






loadHistory();
