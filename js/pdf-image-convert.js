// PDF与图片互转工具
const { PDFDocument } = PDFLib;
pdfjsLib.GlobalWorkerOptions.workerSrc = '../libs/pdf.worker.min.js';

const state = {
    pdfFile: null,
    pdfArrayBuffer: null,
    pdfPageCount: 0,
    images: [],
    nextImgId: 1,
    convertedImages: []
};

// 模式切换
document.querySelectorAll('input[name="mode"]').forEach(radio => {
    radio.addEventListener('change', () => {
        document.getElementById('pdf2img-section').classList.toggle('hidden', radio.value !== 'pdf2img');
        document.getElementById('img2pdf-section').classList.toggle('hidden', radio.value !== 'img2pdf');
    });
});

// ========== PDF转图片 ==========
const pdfUploadArea = document.getElementById('pdf-upload-area');
const pdfInput = document.getElementById('pdf-input');
const pdfInfo = document.getElementById('pdf-info');
const pdfOptions = document.getElementById('pdf-options');
const convertPdfBtn = document.getElementById('convert-pdf-btn');
const downloadAllBtn = document.getElementById('download-all-btn');
const pdfProgress = document.getElementById('pdf-progress');
const pdfProgressText = document.getElementById('pdf-progress-text');
const pdfPreviewGrid = document.getElementById('pdf-preview-grid');

pdfUploadArea.addEventListener('click', () => pdfInput.click());
pdfUploadArea.addEventListener('dragover', e => e.preventDefault());
pdfUploadArea.addEventListener('drop', e => {
    e.preventDefault();
    const file = Array.from(e.dataTransfer.files).find(f => f.type === 'application/pdf');
    if (file) loadPdf(file);
});
pdfInput.addEventListener('change', e => { if (e.target.files[0]) loadPdf(e.target.files[0]); });
convertPdfBtn.addEventListener('click', convertPdfToImages);
downloadAllBtn.addEventListener('click', downloadAllAsZip);

async function loadPdf(file) {
    try {
        state.pdfFile = file;
        state.pdfArrayBuffer = await file.arrayBuffer();
        const pdfDoc = await pdfjsLib.getDocument({ data: state.pdfArrayBuffer.slice(0) }).promise;
        state.pdfPageCount = pdfDoc.numPages;
        
        pdfInfo.classList.remove('hidden');
        pdfInfo.textContent = `已加载: ${file.name} (${state.pdfPageCount}页, ${formatSize(file.size)})`;
        pdfOptions.classList.remove('hidden');
        pdfPreviewGrid.innerHTML = '';
        downloadAllBtn.classList.add('hidden');
    } catch (err) {
        alert('无法读取PDF: ' + err.message);
    }
}

async function convertPdfToImages() {
    if (!state.pdfArrayBuffer) return;
    
    const format = document.getElementById('img-format').value;
    const quality = parseFloat(document.getElementById('img-quality').value);
    const scale = parseFloat(document.getElementById('img-scale').value);
    
    convertPdfBtn.disabled = true;
    downloadAllBtn.classList.add('hidden');
    pdfProgress.classList.remove('hidden');
    pdfPreviewGrid.innerHTML = '';
    state.convertedImages = [];
    
    try {
        const pdfDoc = await pdfjsLib.getDocument({ data: state.pdfArrayBuffer.slice(0) }).promise;
        
        for (let i = 1; i <= state.pdfPageCount; i++) {
            pdfProgressText.textContent = `转换第 ${i}/${state.pdfPageCount} 页...`;
            
            const page = await pdfDoc.getPage(i);
            const viewport = page.getViewport({ scale });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
            
            const dataUrl = canvas.toDataURL(`image/${format}`, quality);
            const fileName = `${state.pdfFile.name.replace('.pdf', '')}_page${i}.${format === 'jpeg' ? 'jpg' : 'png'}`;
            state.convertedImages.push({ fileName, dataUrl });
            
            const item = document.createElement('div');
            item.style.cssText = 'border:1px solid #ddd;border-radius:4px;overflow:hidden;';
            item.innerHTML = `
                <img src="${dataUrl}" style="width:100%;display:block;">
                <div style="padding:8px;font-size:12px;display:flex;justify-content:space-between;">
                    <span>第${i}页</span>
                    <a href="${dataUrl}" download="${fileName}">下载</a>
                </div>
            `;
            pdfPreviewGrid.appendChild(item);
        }
        
        pdfProgressText.textContent = `完成！共转换 ${state.pdfPageCount} 页`;
        downloadAllBtn.classList.remove('hidden');
    } catch (err) {
        pdfProgressText.textContent = '转换失败: ' + err.message;
    } finally {
        convertPdfBtn.disabled = false;
    }
}

async function downloadAllAsZip() {
    if (state.convertedImages.length === 0) return;
    downloadAllBtn.disabled = true;
    downloadAllBtn.textContent = '打包中...';
    
    try {
        const zip = new JSZip();
        for (const img of state.convertedImages) {
            zip.file(img.fileName, img.dataUrl.split(',')[1], { base64: true });
        }
        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${state.pdfFile.name.replace('.pdf', '')}_images.zip`;
        a.click();
        URL.revokeObjectURL(url);
    } catch (err) {
        alert('打包失败: ' + err.message);
    } finally {
        downloadAllBtn.disabled = false;
        downloadAllBtn.textContent = '打包下载全部';
    }
}

// ========== 图片转PDF ==========
const imgUploadArea = document.getElementById('img-upload-area');
const imgInput = document.getElementById('img-input');
const imageList = document.getElementById('image-list');
const imgOptions = document.getElementById('img-options');
const convertImgBtn = document.getElementById('convert-img-btn');
const clearImgBtn = document.getElementById('clear-img-btn');
const imgProgress = document.getElementById('img-progress');
const imgProgressText = document.getElementById('img-progress-text');

imgUploadArea.addEventListener('click', () => imgInput.click());
imgUploadArea.addEventListener('dragover', e => e.preventDefault());
imgUploadArea.addEventListener('drop', e => {
    e.preventDefault();
    processImages(Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')));
});
imgInput.addEventListener('change', e => { processImages(Array.from(e.target.files)); imgInput.value = ''; });
convertImgBtn.addEventListener('click', convertImagesToPdf);
clearImgBtn.addEventListener('click', () => { state.images = []; renderImageList(); imgOptions.classList.add('hidden'); });

async function processImages(files) {
    for (const file of files) {
        const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
        state.images.push({ id: state.nextImgId++, file, name: file.name, dataUrl });
    }
    renderImageList();
    imgOptions.classList.toggle('hidden', state.images.length === 0);
}

function renderImageList() {
    imageList.innerHTML = state.images.map(img => `
        <div class="image-item" draggable="true" data-id="${img.id}" style="display:flex;align-items:center;gap:10px;padding:8px;background:#f5f5f5;border:1px solid #ddd;border-radius:4px;margin-bottom:8px;">
            <span style="cursor:move;">⋮⋮</span>
            <img src="${img.dataUrl}" style="width:50px;height:50px;object-fit:cover;border-radius:4px;">
            <div style="flex:1;min-width:0;">
                <div style="font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${img.name}</div>
                <div style="font-size:12px;color:#666;">${formatSize(img.file.size)}</div>
            </div>
            <button class="btn-remove" data-id="${img.id}">×</button>
        </div>
    `).join('');
    
    imageList.querySelectorAll('.btn-remove').forEach(btn => {
        btn.onclick = () => {
            state.images = state.images.filter(i => i.id !== parseInt(btn.dataset.id));
            renderImageList();
            imgOptions.classList.toggle('hidden', state.images.length === 0);
        };
    });
    initImageDragSort();
}

function initImageDragSort() {
    const items = imageList.querySelectorAll('.image-item');
    let draggedItem = null;
    items.forEach(item => {
        item.addEventListener('dragstart', () => { draggedItem = item; item.style.opacity = '0.5'; });
        item.addEventListener('dragend', () => { item.style.opacity = '1'; draggedItem = null; });
        item.addEventListener('dragover', e => e.preventDefault());
        item.addEventListener('drop', e => {
            e.preventDefault();
            if (item !== draggedItem && draggedItem) {
                const draggedId = parseInt(draggedItem.dataset.id);
                const targetId = parseInt(item.dataset.id);
                const draggedIdx = state.images.findIndex(i => i.id === draggedId);
                const targetIdx = state.images.findIndex(i => i.id === targetId);
                if (draggedIdx !== -1 && targetIdx !== -1) {
                    const [removed] = state.images.splice(draggedIdx, 1);
                    state.images.splice(targetIdx, 0, removed);
                    renderImageList();
                }
            }
        });
    });
}

async function convertImagesToPdf() {
    if (state.images.length === 0) return;
    
    const pageSize = document.getElementById('page-size').value;
    const imgPosition = document.getElementById('img-position').value;
    
    convertImgBtn.disabled = true;
    imgProgress.classList.remove('hidden');
    
    try {
        const pdfDoc = await PDFDocument.create();
        
        for (let i = 0; i < state.images.length; i++) {
            imgProgressText.textContent = `处理第 ${i + 1}/${state.images.length} 张图片...`;
            
            const img = state.images[i];
            const imgBytes = await fetch(img.dataUrl).then(r => r.arrayBuffer());
            
            let embeddedImg;
            if (img.file.type === 'image/png') {
                embeddedImg = await pdfDoc.embedPng(imgBytes);
            } else {
                embeddedImg = await pdfDoc.embedJpg(imgBytes);
            }
            
            const imgWidth = embeddedImg.width;
            const imgHeight = embeddedImg.height;
            
            let pageWidth, pageHeight;
            if (pageSize === 'fit') {
                pageWidth = imgWidth;
                pageHeight = imgHeight;
            } else if (pageSize === 'a4') {
                pageWidth = 595.28;
                pageHeight = 841.89;
            } else {
                pageWidth = 612;
                pageHeight = 792;
            }
            
            const page = pdfDoc.addPage([pageWidth, pageHeight]);
            
            let drawWidth, drawHeight, drawX, drawY;
            if (pageSize === 'fit' || imgPosition === 'fill') {
                drawWidth = pageWidth;
                drawHeight = pageHeight;
                drawX = 0;
                drawY = 0;
            } else {
                const scale = Math.min(pageWidth / imgWidth, pageHeight / imgHeight) * 0.9;
                drawWidth = imgWidth * scale;
                drawHeight = imgHeight * scale;
                drawX = (pageWidth - drawWidth) / 2;
                drawY = (pageHeight - drawHeight) / 2;
            }
            
            page.drawImage(embeddedImg, { x: drawX, y: drawY, width: drawWidth, height: drawHeight });
        }
        
        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `images_${Date.now()}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        
        imgProgressText.textContent = `完成！已生成包含 ${state.images.length} 页的PDF`;
    } catch (err) {
        imgProgressText.textContent = '生成失败: ' + err.message;
    } finally {
        convertImgBtn.disabled = false;
    }
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
