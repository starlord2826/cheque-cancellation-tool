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
const addDigitalTextBtn = document.getElementById('add-digital-text-btn');
const digitalTextInput = document.getElementById('digital-text-input');
const digitalTextModal = document.getElementById('digital-text-modal');
const digitalTextClose = document.getElementById('digital-text-close');
const digitalTextSubmit = document.getElementById('digital-text-submit');
const digitalTextValue = document.getElementById('digital-text-value');
const digitalTextSize = document.getElementById('digital-text-size');
const digitalTextColor = document.getElementById('digital-text-color');

let customElements = [];
let baseImage = null;
let canvasScale = 1;
let isDragging = false;
let dragElement = null;
let dragOffset = { x: 0, y: 0 };
let isResizing = false;
let resizeElement = null;
let resizeStartPos = { x: 0, y: 0 };
let resizeStartSize = { width: 0, height: 0 };

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
            ctx.save();
            ctx.globalCompositeOperation = 'source-over';
            
            const centerX = element.x + element.width / 2;
            const centerY = element.y + element.height / 2;
            
            ctx.translate(centerX, centerY);
            ctx.rotate((element.rotation * Math.PI) / 180);
            ctx.translate(-centerX, -centerY);
            
            ctx.drawImage(
                element.image,
                element.x,
                element.y,
                element.width,
                element.height
            );
            ctx.restore();
        }
    });
}

cancelledTextInput.addEventListener('change', (e) => {
    handleElementUpload(e.target.files[0], 'cancelled-text');
});

signatureInput.addEventListener('change', (e) => {
    handleElementUpload(e.target.files[0], 'signature');
});

function removeBackground(img) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = img.width;
    canvas.height = img.height;
    
    ctx.drawImage(img, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const width = canvas.width;
    const height = canvas.height;
    
    const backgroundSamples = [];
    const sampleSize = Math.max(5, Math.min(width, height) / 30);
    
    const corners = [
        [0, 0],
        [width - 1, 0],
        [0, height - 1],
        [width - 1, height - 1]
    ];
    
    for (let [cx, cy] of corners) {
        for (let dy = -sampleSize; dy <= sampleSize; dy += sampleSize) {
            for (let dx = -sampleSize; dx <= sampleSize; dx += sampleSize) {
                const x = Math.max(0, Math.min(width - 1, cx + dx));
                const y = Math.max(0, Math.min(height - 1, cy + dy));
                const idx = (y * width + x) * 4;
                if (idx < data.length) {
                    const r = data[idx];
                    const g = data[idx + 1];
                    const b = data[idx + 2];
                    const brightness = (r * 0.299 + g * 0.587 + b * 0.114);
                    backgroundSamples.push({ r, g, b, brightness });
                }
            }
        }
    }
    
    for (let y = 0; y < height; y += sampleSize * 3) {
        for (let x = 0; x < width; x += sampleSize * 3) {
            const idx = (y * width + x) * 4;
            if (idx < data.length) {
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                const brightness = (r * 0.299 + g * 0.587 + b * 0.114);
                
                if (brightness > 170) {
                    backgroundSamples.push({ r, g, b, brightness });
                }
            }
        }
    }
    
    if (backgroundSamples.length === 0) {
        backgroundSamples.push({ r: 255, g: 255, b: 255, brightness: 255 });
    }
    
    backgroundSamples.sort((a, b) => a.brightness - b.brightness);
    const medianIdx = Math.floor(backgroundSamples.length / 2);
    const bgColor = backgroundSamples[medianIdx];
    
    const bgR = bgColor.r;
    const bgG = bgColor.g;
    const bgB = bgColor.b;
    const bgBrightness = bgColor.brightness;
    
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        const brightness = (r * 0.299 + g * 0.587 + b * 0.114);
        
        const colorDistance = Math.sqrt(
            Math.pow(r - bgR, 2) + 
            Math.pow(g - bgG, 2) + 
            Math.pow(b - bgB, 2)
        );
        
        const brightnessDiff = brightness - bgBrightness;
        
        const x = (i / 4) % width;
        const y = Math.floor((i / 4) / width);
        
        let maxNeighborDiff = 0;
        if (x > 0 && x < width - 1 && y > 0 && y < height - 1) {
            const neighbors = [
                (y - 1) * width + x,
                (y + 1) * width + x,
                y * width + (x - 1),
                y * width + (x + 1)
            ];
            
            for (let nIdx of neighbors) {
                const nR = data[nIdx * 4];
                const nG = data[nIdx * 4 + 1];
                const nB = data[nIdx * 4 + 2];
                const nBrightness = (nR * 0.299 + nG * 0.587 + nB * 0.114);
                const diff = Math.abs(brightness - nBrightness);
                maxNeighborDiff = Math.max(maxNeighborDiff, diff);
            }
        }
        
        const isLikelyText = brightnessDiff < -25 || 
                            (colorDistance > 40 && brightnessDiff < -15) ||
                            (maxNeighborDiff > 20 && brightness < bgBrightness - 15);
        
        if (isLikelyText) {
            data[i] = 0;
            data[i + 1] = 0;
            data[i + 2] = 0;
        } else {
            data[i + 3] = 0;
        }
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    const processedImg = new Image();
    processedImg.src = canvas.toDataURL('image/png');
    return processedImg;
}

function handleElementUpload(file, type) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.src = e.target.result;
        img.onload = () => {
            if (type === 'cancelled-text') {
                const processedImg = removeBackground(img);
                processedImg.onload = () => {
                    addElementToCanvas(processedImg, type);
                };
            } else {
                addElementToCanvas(img, type);
            }
        };
    };
    reader.readAsDataURL(file);
}

function createTextImage(text, fontSize, color) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    ctx.font = `bold ${fontSize}px Arial`;
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const textHeight = fontSize;
    
    canvas.width = textWidth + 40;
    canvas.height = textHeight + 40;
    
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    
    const img = new Image();
    img.src = canvas.toDataURL('image/png');
    return img;
}

addDigitalTextBtn.addEventListener('click', () => {
    digitalTextModal.style.display = 'flex';
    digitalTextValue.value = 'CANCELLED';
});

digitalTextClose.addEventListener('click', () => {
    digitalTextModal.style.display = 'none';
});

digitalTextSubmit.addEventListener('click', () => {
    const text = digitalTextValue.value.trim() || 'CANCELLED';
    const fontSize = parseInt(digitalTextSize.value) || 60;
    const color = digitalTextColor.value || '#000000';
    
    const textImg = createTextImage(text, fontSize, color);
    textImg.onload = () => {
        addElementToCanvas(textImg, 'cancelled-text');
        digitalTextModal.style.display = 'none';
    };
});

window.addEventListener('click', (e) => {
    if (e.target === digitalTextModal) {
        digitalTextModal.style.display = 'none';
    }
});

function addElementToCanvas(img, type) {
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
        displayHeight: height * canvasScale,
        rotation: 0
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
}

function addElementToOverlay(element) {
    const draggableDiv = document.createElement('div');
    draggableDiv.className = 'draggable-element';
    draggableDiv.id = `element-${element.id}`;
    draggableDiv.style.left = (element.x * canvasScale) + 'px';
    draggableDiv.style.top = (element.y * canvasScale) + 'px';
    draggableDiv.style.width = element.displayWidth + 'px';
    draggableDiv.style.height = element.displayHeight + 'px';
    draggableDiv.style.transform = `rotate(${element.rotation}deg)`;
    draggableDiv.style.transformOrigin = 'center center';
    
    const img = document.createElement('img');
    img.src = element.image.src;
    draggableDiv.appendChild(img);
    
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'element-controls';
    
    const rotateBtn = document.createElement('button');
    rotateBtn.className = 'rotate-btn';
    rotateBtn.innerHTML = '↻';
    rotateBtn.title = 'Rotate';
    rotateBtn.onclick = (e) => {
        e.stopPropagation();
        rotateElement(element.id, 90);
    };
    controlsDiv.appendChild(rotateBtn);
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.innerHTML = '×';
    removeBtn.title = 'Remove';
    removeBtn.onclick = (e) => {
        e.stopPropagation();
        removeElement(element.id);
    };
    controlsDiv.appendChild(removeBtn);
    
    draggableDiv.appendChild(controlsDiv);
    
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'resize-handle';
    resizeHandle.title = 'Resize';
    resizeHandle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        startResize(element, draggableDiv, e);
    });
    resizeHandle.addEventListener('touchstart', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const touch = e.touches[0];
        startResize(element, draggableDiv, {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
    });
    draggableDiv.appendChild(resizeHandle);
    
    draggableDiv.addEventListener('mousedown', (e) => {
        if (e.target === removeBtn || e.target === rotateBtn || e.target === resizeHandle || e.target.closest('.element-controls') || e.target.closest('.resize-handle')) return;
        startDrag(element, draggableDiv, e);
    });
    
    draggableDiv.addEventListener('touchstart', (e) => {
        if (e.target === removeBtn || e.target === rotateBtn || e.target === resizeHandle || e.target.closest('.element-controls') || e.target.closest('.resize-handle')) return;
        e.preventDefault();
        const touch = e.touches[0];
        startDrag(element, draggableDiv, {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
    });
    
    draggableOverlay.appendChild(draggableDiv);
}

function rotateElement(elementId, angle) {
    const element = customElements.find(el => el.id === elementId);
    if (!element) return;
    
    element.rotation = (element.rotation + angle) % 360;
    
    const div = document.getElementById(`element-${elementId}`);
    if (div) {
        div.style.transform = `rotate(${element.rotation}deg)`;
    }
    
    renderCanvas();
}

function startDrag(element, div, e) {
    if (isResizing) return;
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

function startResize(element, div, e) {
    if (isDragging) return;
    isResizing = true;
    resizeElement = element;
    div.classList.add('resizing');
    
    const rect = draggableOverlay.getBoundingClientRect();
    resizeStartPos.x = e.clientX;
    resizeStartPos.y = e.clientY;
    resizeStartSize.width = element.displayWidth;
    resizeStartSize.height = element.displayHeight;
    
    document.addEventListener('mousemove', onResize);
    document.addEventListener('mouseup', stopResize);
    document.addEventListener('touchmove', onTouchResize);
    document.addEventListener('touchend', stopResize);
}

function onResize(e) {
    if (!isResizing || !resizeElement) return;
    
    const deltaX = e.clientX - resizeStartPos.x;
    const deltaY = e.clientY - resizeStartPos.y;
    
    const aspectRatio = resizeStartSize.width / resizeStartSize.height;
    
    let newWidth = resizeStartSize.width + deltaX;
    let newHeight = resizeStartSize.height + deltaY;
    
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        newHeight = newWidth / aspectRatio;
    } else {
        newWidth = newHeight * aspectRatio;
    }
    
    const maxWidth = draggableOverlay.offsetWidth - (resizeElement.x * canvasScale);
    const maxHeight = draggableOverlay.offsetHeight - (resizeElement.y * canvasScale);
    
    newWidth = Math.max(50, Math.min(newWidth, maxWidth));
    newHeight = Math.max(50, Math.min(newHeight, maxHeight));
    
    if (newWidth / newHeight > aspectRatio) {
        newWidth = newHeight * aspectRatio;
    } else {
        newHeight = newWidth / aspectRatio;
    }
    
    resizeElement.displayWidth = newWidth;
    resizeElement.displayHeight = newHeight;
    resizeElement.width = newWidth / canvasScale;
    resizeElement.height = newHeight / canvasScale;
    
    const div = document.getElementById(`element-${resizeElement.id}`);
    if (div) {
        div.style.width = newWidth + 'px';
        div.style.height = newHeight + 'px';
    }
    
    renderCanvas();
}

function onTouchResize(e) {
    if (!isResizing || !resizeElement) return;
    e.preventDefault();
    const touch = e.touches[0];
    onResize({
        clientX: touch.clientX,
        clientY: touch.clientY
    });
}

function stopResize() {
    if (resizeElement) {
        const div = document.getElementById(`element-${resizeElement.id}`);
        if (div) {
            div.classList.remove('resizing');
        }
    }
    isResizing = false;
    resizeElement = null;
    
    document.removeEventListener('mousemove', onResize);
    document.removeEventListener('mouseup', stopResize);
    document.removeEventListener('touchmove', onTouchResize);
    document.removeEventListener('touchend', stopResize);
}

function onDrag(e) {
    if (!isDragging || !dragElement || isResizing) return;
    
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
                div.style.transform = `rotate(${element.rotation}deg)`;
            }
        });
    }
});
