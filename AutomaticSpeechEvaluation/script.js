const fileInput = document.getElementById('file-input');
const dropZone = document.getElementById('drop-zone');
const evaluateBtn = document.getElementById('evaluate-btn');
const loader = document.getElementById('loader');
const processingText = document.getElementById('processing-text');
const resultCard = document.getElementById('result-card');
const mosScore = document.getElementById('mos-score');
const audioPreview = document.getElementById('audio-preview');
const errorMsg = document.getElementById('error-msg');

let selectedFile = null;
let currentAudioUrl = null;

// --- 1. Handle File Selection ---

if (dropZone) {
    dropZone.onclick = () => fileInput.click();

    dropZone.ondragover = (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#0056b3';
        dropZone.style.background = 'rgba(255, 255, 255, 0.2)';
    };

    dropZone.ondragleave = () => {
        dropZone.style.borderColor = '#011e3d';
        dropZone.style.background = 'rgba(255, 255, 255, 0.1)';
    };

    dropZone.ondrop = (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#011e3d';
        dropZone.style.background = 'rgba(255, 255, 255, 0.1)';
        if (e.dataTransfer.files && e.target.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    };
}

if (fileInput) {
    fileInput.onchange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    };
}

function handleFile(file) {
    if (!file) return;
    
    // Check extension
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.wav')) {
        selectedFile = file;
        evaluateBtn.disabled = false;
        errorMsg.style.display = 'none';
        
        // UPDATE UI TEXT
        const pTag = dropZone.querySelector('p');
        if (pTag) {
            pTag.innerHTML = `Click or drag & drop a <b>.wav</b> file here<br><span id="file-selection-info" style="display: block; margin-top: 10px; color: #011e3d; font-size: 0.9rem; font-weight: bold;">Selected: ${file.name}</span>`;
        }
        
        // Revoke old URL if it exists
        if (currentAudioUrl) {
            URL.revokeObjectURL(currentAudioUrl);
        }

        // Show audio preview
        currentAudioUrl = URL.createObjectURL(file);
        audioPreview.src = currentAudioUrl;
        audioPreview.style.display = 'block';
        audioPreview.load();
        
        // Reset result
        resultCard.style.display = 'none';
        console.log("File selected and UI updated:", file.name);
    } else {
        showError('Please select a valid .wav file.');
        evaluateBtn.disabled = true;
    }
}

// --- 2. Handle Evaluation ---

evaluateBtn.onclick = async () => {
    if (!selectedFile) return;

    setLoading(true);
    
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
        const response = await fetch('/api/evaluate/evaluate', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to evaluate audio.');
        }

        const data = await response.json();
        displayResult(data.mos_score);
    } catch (err) {
        showError(err.message);
    } finally {
        setLoading(false);
    }
};

// --- 3. UI Helpers ---

function setLoading(isLoading) {
    if (isLoading) {
        loader.style.display = 'block';
        processingText.style.display = 'block';
        evaluateBtn.disabled = true;
        evaluateBtn.textContent = "Evaluating...";
        resultCard.style.display = 'none';
        errorMsg.style.display = 'none';
    } else {
        loader.style.display = 'none';
        processingText.style.display = 'none';
        evaluateBtn.disabled = false;
        evaluateBtn.textContent = "Evaluate Audio";
    }
}

function displayResult(score) {
    mosScore.textContent = score.toFixed(2);
    resultCard.style.display = 'block';
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.style.display = 'block';
    resultCard.style.display = 'none';
}
