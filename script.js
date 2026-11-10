document.addEventListener('DOMContentLoaded', () => {
    console.log('WebHub initialized.');

    const speechEvalBtn = document.querySelector('a[href="AutomaticSpeechEvaluation/index.html"]');
    const speechDetectBtn = document.querySelector('a[href="SyntheticSpeechDetection/index.html"]');
    const loadingModal = document.getElementById('loading-modal');

    if (speechEvalBtn && loadingModal) {
        speechEvalBtn.addEventListener('click', async (e) => {
            handleAppClick(e, 'evaluate', speechEvalBtn.getAttribute('href'));
        });
    }

    if (speechDetectBtn && loadingModal) {
        speechDetectBtn.addEventListener('click', async (e) => {
            e.preventDefault(); // Stop navigation immediately
            
            // Show the modal
            loadingModal.style.display = 'flex';
            const modalMsg = document.getElementById('modal-message');
            modalMsg.textContent = "Please wait while we load the Wav2Vec 2.0 Detection models (1.2GB). This happens only once per session.";

            const targetUrl = speechDetectBtn.getAttribute('href');
            
            // Trigger load and wait
            try {
                await fetch('/api/detect/start_load', { method: 'POST' });
                await checkStatusAndRedirect('detect', targetUrl);
            } catch (err) {
                showModalError("Connection Error", "Could not reach the server.");
            }
        });
    }

    async function handleAppClick(e, type, targetUrl) {
        e.preventDefault();
        loadingModal.style.display = 'flex';
        
        // Update modal text based on type
        const modalMsg = document.getElementById('modal-message');
        if (type === 'detect') {
            modalMsg.textContent = "Please wait while we load the Wav2Vec 2.0 Detection models. This happens only once.";
        } else {
            modalMsg.textContent = "Please wait while we load the Speech Evaluation models. This happens only once.";
        }

        await startModelLoad(type);
        await checkStatusAndRedirect(type, targetUrl);
    }
});

async function startModelLoad(type) {
    try {
        await fetch(`/api/${type}/start_load`, { method: 'POST' });
    } catch (err) {
        console.log(`Start load request for ${type} sent.`);
    }
}

async function checkStatusAndRedirect(type, url) {
    try {
        const response = await fetch(`/api/${type}/status`);
        const data = await response.json();

        if (data.ready) {
            window.location.href = url;
        } else if (data.error) {
            showModalError("Model Load Failed", data.error);
        } else {
            setTimeout(() => checkStatusAndRedirect(type, url), 1000);
        }
    } catch (err) {
        setTimeout(() => checkStatusAndRedirect(type, url), 2000);
    }
}

function showModalError(title, message) {
    const modalTitle = document.getElementById('modal-title');
    const modalMsg = document.getElementById('modal-message');
    const loader = document.querySelector('.loader');

    if (modalTitle) modalTitle.textContent = title;
    if (modalMsg) modalMsg.textContent = message;
    if (loader) loader.style.display = 'none';
}
