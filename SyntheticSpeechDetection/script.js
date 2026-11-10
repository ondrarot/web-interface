const loadingModal = document.getElementById('loading-modal');

// --- 1. Check Model Status IMMEDIATELY ---
let isModelReady = false;

async function checkModelStatus() {
    try {
        const response = await fetch('/api/detect/status');
        const data = await response.json();

        if (data.ready) {
            isModelReady = true;
            if (loadingModal) loadingModal.style.display = 'none'; 
            if (selectedFile) detectBtn.disabled = false;
        } else {
            isModelReady = false;
            // Ensure modal is visible
            if (loadingModal) loadingModal.style.display = 'flex'; 
            
            if (data.error) {
                showModalError("Model Load Failed", data.error);
                return;
            }

            if (!data.is_loading) {
                fetch('/api/detect/start_load', { method: 'POST' });
            }
            setTimeout(checkModelStatus, 1000); // Check faster (every 1s)
        }
    } catch (err) {
        console.error("Status check failed", err);
        setTimeout(checkModelStatus, 3000);
    }
}

function showModalError(title, message) {
    const modalTitle = document.getElementById('modal-title');
    const modalMsg = document.getElementById('modal-message');
    const loaderElem = document.querySelector('.loader');

    if (modalTitle) modalTitle.textContent = title;
    if (modalMsg) modalMsg.textContent = message;
    if (loaderElem) loaderElem.style.display = 'none';
}

// Start checking status before defining other UI elements
checkModelStatus();

// --- 2. Define UI Elements ---
const fileInput = document.getElementById('file-input');
const dropZone = document.getElementById('drop-zone');
const detectBtn = document.getElementById('detect-btn');
const loader = document.getElementById('loader');
const processingText = document.getElementById('processing-text');
const resultCard = document.getElementById('result-card');
const predictionLabel = document.getElementById('prediction-label');
const confidenceText = document.getElementById('confidence-text');
const audioPreview = document.getElementById('audio-preview');
const errorMsg = document.getElementById('error-msg');
const realProbText = document.getElementById('real-prob');
const synthProbText = document.getElementById('synth-prob');

let selectedFile = null;
let currentAudioUrl = null;

// --- 3. Handle File Selection ---

if (dropZone) {
    dropZone.onclick = () => fileInput.click();

    dropZone.ondragover = (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#0056b3';
    };

    dropZone.ondragleave = () => {
        dropZone.style.borderColor = '#011e3d';
    };

    dropZone.ondrop = (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#011e3d';
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
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

    if (file.name.toLowerCase().endsWith('.wav') || file.name.toLowerCase().endsWith('.mp3')) {
        selectedFile = file;
        detectBtn.disabled = !isModelReady;
        errorMsg.style.display = 'none';
        
        // Update text
        const pTag = dropZone.querySelector('p');
        if (pTag) {
            pTag.innerHTML = `Click or drag & drop a <b>.wav</b> file here<br><span style="display: block; margin-top: 10px; color: #011e3d; font-size: 0.9rem; font-weight: bold;">Selected: ${file.name}</span>`;
        }

        // Revoke old URL
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
    } else {
        showError('Please select a valid audio file (.wav, .mp3).');
        detectBtn.disabled = true;
    }
}

// --- 4. Handle Detection ---

detectBtn.onclick = async () => {
    if (!selectedFile) return;

    setLoading(true);
    
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
        const response = await fetch('/api/detect/detect', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to detect speech authenticity.');
        }

        const data = await response.json();
        displayResult(data);
    } catch (err) {
        showError(err.message);
    } finally {
        setLoading(false);
    }
};

// --- 5. UI Helpers ---

function setLoading(isLoading) {
    if (isLoading) {
        loader.style.display = 'block';
        processingText.style.display = 'block';
        detectBtn.disabled = true;
        resultCard.style.display = 'none';
        errorMsg.style.display = 'none';
    } else {
        loader.style.display = 'none';
        processingText.style.display = 'none';
        detectBtn.disabled = !isModelReady;
    }
}

function displayResult(data) {
    predictionLabel.textContent = data.prediction;
    predictionLabel.className = 'prediction-label ' + (data.prediction === 'Real' ? 'real-text' : 'synthetic-text');
    
    confidenceText.textContent = `Confidence: ${data.confidence}%`;
    realProbText.textContent = `Real: ${data.real_probability}%`;
    synthProbText.textContent = `Synthetic: ${data.synthetic_probability}%`;
    
    resultCard.style.display = 'block';
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.style.display = 'block';
    resultCard.style.display = 'none';
}
