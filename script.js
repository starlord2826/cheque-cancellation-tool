const cameraInput = document.getElementById('camera-input');
const fileInput = document.getElementById('file-input');
const previewSection = document.getElementById('preview-section');
const originalImage = document.getElementById('original-image');
const processedCanvas = document.getElementById('processed-canvas');
const downloadBtn = document.getElementById('download-btn');
const resetBtn = document.getElementById('reset-btn');
const cancelledTextInput = document.getElementById('cancelled-text-input');
const signatureInput = document.getElementById('signature-input');
const draggableOverlay = document.getElementById('draggable-overlay');
const uploadedElements = document.getElementById('uploaded-elements');
const clearElementsBtn = document.getElementById('clear-elements-btn');

let customElements = [];
let baseImage = null;
let canvasScale = 1;
let isDragging = false;
let dragElement = null;
let dragOffset = { x: 0, y: 0 };

cameraInput.addEventListener('change', (e) => {
    handleImageInput(e.target.files[0]);
});

fileInput.addEventListener('change', (e) => {
    handleImageInput(e.target.files[0]);
});

function handleImageInput(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const imageUrl = e.target.result;
        originalImage.src = imageUrl;
        
        originalImage.onload = () => {
            baseImage = new Image();
            baseImage.src = imageUrl;
            baseImage.onload = () => {
                initializeCanvas();
                previewSection.style.display = 'block';
                previewSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            };
        };
    };
    reader.readAsDataURL(file);
}

function initializeCanvas() {
    processedCanvas.width = baseImage.width;
    processedCanvas.height = baseImage.height;
    
    const maxDisplayWidth = Math.min(800, window.innerWidth - 80);
    canvasScale = maxDisplayWidth / baseImage.width;
    
    const displayedWidth = baseImage.width * canvasScale;
    const displayedHeight = baseImage.height * canvasScale;
    draggableOverlay.style.width = displayedWidth + 'px';
    draggableOverlay.style.height = displayedHeight + 'px';
    
    renderCanvas();
}

function renderCanvas() {
    const ctx = processedCanvas.getContext('2d');
    
    ctx.clearRect(0, 0, processedCanvas.width, processedCanvas.height);
    
    ctx.drawImage(baseImage, 0, 0);
    
    customElements.forEach(element => {
        if (element.image && element.image.complete) {
            ctx.drawImage(
                element.image,
                element.x,
                element.y,
                element.width,
                element.height
            );
        }
    });
}

cancelledTextInput.addEventListener('change', (e) => {
    handleElementUpload(e.target.files[0], 'cancelled-text');
});

signatureInput.addEventListener('change', (e) => {
    handleElementUpload(e.target.files[0], 'signature');
});

function handleElementUpload(file, type) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.src = e.target.result;
        img.onload = () => {
            const maxWidth = baseImage.width * 0.4;
            const maxHeight = baseImage.height * 0.3;
            
            let width = img.width;
            let height = img.height;
            
            if (width > maxWidth) {
                const scale = maxWidth / width;
                width = maxWidth;
                height = height * scale;
            }
            if (height > maxHeight) {
                const scale = maxHeight / height;
                height = maxHeight;
                width = width * scale;
            }
            
            const x = (baseImage.width - width) / 2;
            const y = type === 'signature' 
                ? baseImage.height - height - 50
                : (baseImage.height - height) / 2;
            
            const element = {
                id: Date.now() + Math.random(),
                type: type,
                image: img,
                x: x,
                y: y,
                width: width,
                height: height,
                displayWidth: width * canvasScale,
                displayHeight: height * canvasScale
            };
            
            customElements.push(element);
            addElementToOverlay(element);
            addElementToPreview(element);
            renderCanvas();
            
            if (type === 'cancelled-text') {
                cancelledTextInput.value = '';
            } else {
                signatureInput.value = '';
            }
        };
    };
    reader.readAsDataURL(file);
}

function addElementToOverlay(element) {
    const draggableDiv = document.createElement('div');
    draggableDiv.className = 'draggable-element';
    draggableDiv.id = `element-${element.id}`;
    draggableDiv.style.left = (element.x * canvasScale) + 'px';
    draggableDiv.style.top = (element.y * canvasScale) + 'px';
    draggableDiv.style.width = element.displayWidth + 'px';
    draggableDiv.style.height = element.displayHeight + 'px';
    
    const img = document.createElement('img');
    img.src = element.image.src;
    draggableDiv.appendChild(img);
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.innerHTML = '×';
    removeBtn.onclick = (e) => {
        e.stopPropagation();
        removeElement(element.id);
    };
    draggableDiv.appendChild(removeBtn);
    
    draggableDiv.addEventListener('mousedown', (e) => {
        if (e.target === removeBtn) return;
        startDrag(element, draggableDiv, e);
    });
    
    draggableDiv.addEventListener('touchstart', (e) => {
        if (e.target === removeBtn) return;
        e.preventDefault();
        const touch = e.touches[0];
        startDrag(element, draggableDiv, {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
    });
    
    draggableOverlay.appendChild(draggableDiv);
}

function startDrag(element, div, e) {
    isDragging = true;
    dragElement = element;
    div.classList.add('dragging');
    
    const rect = draggableOverlay.getBoundingClientRect();
    const elementRect = div.getBoundingClientRect();
    
    dragOffset.x = e.clientX - elementRect.left;
    dragOffset.y = e.clientY - elementRect.top;
    
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', stopDrag);
    document.addEventListener('touchmove', onTouchDrag);
    document.addEventListener('touchend', stopDrag);
}

function onDrag(e) {
    if (!isDragging || !dragElement) return;
    
    const rect = draggableOverlay.getBoundingClientRect();
    let x = e.clientX - rect.left - dragOffset.x;
    let y = e.clientY - rect.top - dragOffset.y;
    
    x = Math.max(0, Math.min(x, draggableOverlay.offsetWidth - dragElement.displayWidth));
    y = Math.max(0, Math.min(y, draggableOverlay.offsetHeight - dragElement.displayHeight));
    
    dragElement.x = x / canvasScale;
    dragElement.y = y / canvasScale;
    
    const div = document.getElementById(`element-${dragElement.id}`);
    if (div) {
        div.style.left = x + 'px';
        div.style.top = y + 'px';
    }
    
    renderCanvas();
}

function onTouchDrag(e) {
    if (!isDragging || !dragElement) return;
    e.preventDefault();
    const touch = e.touches[0];
    onDrag({
        clientX: touch.clientX,
        clientY: touch.clientY
    });
}

function stopDrag() {
    if (dragElement) {
        const div = document.getElementById(`element-${dragElement.id}`);
        if (div) {
            div.classList.remove('dragging');
        }
    }
    isDragging = false;
    dragElement = null;
    
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', stopDrag);
    document.removeEventListener('touchmove', onTouchDrag);
    document.removeEventListener('touchend', stopDrag);
}

function removeElement(elementId) {
    customElements = customElements.filter(el => el.id !== elementId);
    const div = document.getElementById(`element-${elementId}`);
    if (div) {
        div.remove();
    }
    removeElementFromPreview(elementId);
    renderCanvas();
}

function addElementToPreview(element) {
    const preview = document.createElement('div');
    preview.className = 'uploaded-element-preview';
    preview.id = `preview-${element.id}`;
    preview.textContent = element.type === 'cancelled-text' ? 'Cancelled Text' : 'Signature';
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-preview-btn';
    removeBtn.innerHTML = '×';
    removeBtn.onclick = () => removeElement(element.id);
    preview.appendChild(removeBtn);
    
    uploadedElements.appendChild(preview);
}

function removeElementFromPreview(elementId) {
    const preview = document.getElementById(`preview-${elementId}`);
    if (preview) {
        preview.remove();
    }
}

clearElementsBtn.addEventListener('click', () => {
    customElements.forEach(element => {
        const div = document.getElementById(`element-${element.id}`);
        if (div) {
            div.remove();
        }
        removeElementFromPreview(element.id);
    });
    customElements = [];
    renderCanvas();
});

downloadBtn.addEventListener('click', () => {
    processedCanvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'cancelled-cheque.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 'image/png');
});

resetBtn.addEventListener('click', () => {
    cameraInput.value = '';
    fileInput.value = '';
    cancelledTextInput.value = '';
    signatureInput.value = '';
    
    customElements.forEach(element => {
        const div = document.getElementById(`element-${element.id}`);
        if (div) {
            div.remove();
        }
        removeElementFromPreview(element.id);
    });
    customElements = [];
    
    previewSection.style.display = 'none';
    
    originalImage.src = '';
    baseImage = null;
    const ctx = processedCanvas.getContext('2d');
    ctx.clearRect(0, 0, processedCanvas.width, processedCanvas.height);
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

window.addEventListener('resize', () => {
    if (baseImage) {
        initializeCanvas();
        customElements.forEach(element => {
            element.displayWidth = element.width * canvasScale;
            element.displayHeight = element.height * canvasScale;
            const div = document.getElementById(`element-${element.id}`);
            if (div) {
                div.style.left = (element.x * canvasScale) + 'px';
                div.style.top = (element.y * canvasScale) + 'px';
                div.style.width = element.displayWidth + 'px';
                div.style.height = element.displayHeight + 'px';
            }
        });
    }
});
