// PDF页面提取合并工具
const { PDFDocument } = PDFLib;
pdfjsLib.GlobalWorkerOptions.workerSrc = '../libs/pdf.worker.min.js';

const state = {
    pdfFiles: [],
    nextId: 1,
    currentPreviewId: null,
    selectedPages: new Set()
};

const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('file-input');
const pdfList = document.getElementById('pdf-list');
const optionsEl = document.getElementById('options');
const mergeBtn = document.getElementById('merge-btn');
const clearBtn = document.getElementById('clear-btn');
const progressEl = document.getElementById('progress');
const progressText = document.getElementById('progress-text');

uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', e => e.preventDefault());
uploadArea.addEventListener('drop', e => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
    processFiles(files);
});
fileInput.addEventListener('change', e => {
    processFiles(Array.from(e.target.files));
    fileInput.value = '';
});
mergeBtn.addEventListener('click', mergePDFs);
clearBtn.addEventListener('click', () => { state.pdfFiles = []; renderList(); updateUI(); });

async function processFiles(files) {
    for (const file of files) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await PDFDocument.load(arrayBuffer);
            state.pdfFiles.push({
                id: state.nextId++,
                file,
                name: file.name,
                pageCount: pdfDoc.getPageCount(),
                arrayBuffer
            });
        } catch (err) {
            alert(`无法读取 ${file.name}: ${err.message}`);
        }
    }
    renderList();
    updateUI();
}

function renderList() {
    pdfList.innerHTML = state.pdfFiles.map(pdf => `
        <div class="image-item" draggable="true" data-id="${pdf.id}" style="display:flex;align-items:center;gap:10px;padding:10px;background:#f5f5f5;border:1px solid #ddd;border-radius:4px;margin-bottom:8px;">
            <span style="cursor:move;">⋮⋮</span>
            <div style="flex:1;min-width:0;">
                <div style="font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${pdf.name}</div>
                <div style="font-size:12px;color:#666;">${pdf.pageCount}页 | ${formatSize(pdf.file.size)}</div>
            </div>
            <button class="btn-preview" data-id="${pdf.id}" style="font-size:12px;">预览</button>
            <input type="text" class="pages-input" data-id="${pdf.id}" placeholder="页面范围" style="width:120px;padding:4px;font-size:12px;">
            <button class="btn-remove" data-id="${pdf.id}">×</button>
        </div>
    `).join('');
    
    pdfList.querySelectorAll('.btn-remove').forEach(btn => {
        btn.onclick = () => {
            state.pdfFiles = state.pdfFiles.filter(p => p.id !== parseInt(btn.dataset.id));
            renderList();
            updateUI();
        };
    });
    
    pdfList.querySelectorAll('.btn-preview').forEach(btn => {
        btn.onclick = () => openPreview(parseInt(btn.dataset.id));
    });
    
    initDragSort();
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function updateUI() {
    optionsEl.classList.toggle('hidden', state.pdfFiles.length === 0);
    mergeBtn.disabled = state.pdfFiles.length === 0;
}

function initDragSort() {
    const items = pdfList.querySelectorAll('.image-item');
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
                const draggedIdx = state.pdfFiles.findIndex(p => p.id === draggedId);
                const targetIdx = state.pdfFiles.findIndex(p => p.id === targetId);
                if (draggedIdx !== -1 && targetIdx !== -1) {
                    const [removed] = state.pdfFiles.splice(draggedIdx, 1);
                    state.pdfFiles.splice(targetIdx, 0, removed);
                    renderList();
                }
            }
        });
    });
}

function parsePageRange(rangeStr, maxPage) {
    if (!rangeStr || !rangeStr.trim()) return Array.from({ length: maxPage }, (_, i) => i);
    const pages = new Set();
    for (const part of rangeStr.split(',')) {
        const trimmed = part.trim();
        if (!trimmed) continue;
        if (trimmed.includes('-')) {
            const [start, end] = trimmed.split('-').map(s => parseInt(s.trim()));
            if (!isNaN(start) && !isNaN(end)) {
                for (let i = Math.max(1, start); i <= Math.min(maxPage, end); i++) pages.add(i - 1);
            }
        } else {
            const page = parseInt(trimmed);
            if (!isNaN(page) && page >= 1 && page <= maxPage) pages.add(page - 1);
        }
    }
    return Array.from(pages).sort((a, b) => a - b);
}

// 预览相关
const previewModal = document.getElementById('preview-modal');
const previewGrid = document.getElementById('preview-grid');
const previewTitle = document.getElementById('preview-title');
const selectionInfo = document.getElementById('selection-info');

document.getElementById('close-modal').onclick = () => previewModal.classList.add('hidden');
previewModal.onclick = e => { if (e.target === previewModal) previewModal.classList.add('hidden'); };
document.getElementById('select-all-btn').onclick = selectAllPages;
document.getElementById('clear-selection-btn').onclick = clearSelection;
document.getElementById('apply-selection-btn').onclick = applySelection;

async function openPreview(pdfId) {
    const pdf = state.pdfFiles.find(p => p.id === pdfId);
    if (!pdf) return;
    
    state.currentPreviewId = pdfId;
    state.selectedPages.clear();
    
    const input = document.querySelector(`.pages-input[data-id="${pdfId}"]`);
    if (input && input.value.trim()) {
        parsePageRange(input.value, pdf.pageCount).forEach(p => state.selectedPages.add(p));
    }
    
    previewTitle.textContent = `预览: ${pdf.name}`;
    previewGrid.innerHTML = '<div style="text-align:center;padding:40px;color:#666;">加载中...</div>';
    previewModal.classList.remove('hidden');
    
    try {
        const pdfDoc = await pdfjsLib.getDocument({ data: pdf.arrayBuffer.slice(0) }).promise;
        previewGrid.innerHTML = '';
        
        for (let i = 1; i <= pdf.pageCount; i++) {
            const page = await pdfDoc.getPage(i);
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            canvas.style.width = '100%';
            await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
            
            const pageDiv = document.createElement('div');
            pageDiv.className = 'preview-page';
            pageDiv.dataset.page = i - 1;
            pageDiv.style.cssText = 'border:2px solid #ddd;border-radius:4px;overflow:hidden;cursor:pointer;' + 
                (state.selectedPages.has(i - 1) ? 'border-color:#0d6efd;background:#e7f1ff;' : '');
            pageDiv.innerHTML = `<div style="text-align:center;padding:5px;font-size:12px;background:#f5f5f5;">第${i}页</div>`;
            pageDiv.insertBefore(canvas, pageDiv.firstChild);
            pageDiv.onclick = () => togglePageSelection(pageDiv, i - 1);
            previewGrid.appendChild(pageDiv);
        }
        updateSelectionInfo();
    } catch (err) {
        previewGrid.innerHTML = `<div style="color:red;padding:20px;">加载失败: ${err.message}</div>`;
    }
}

function togglePageSelection(pageDiv, pageIndex) {
    if (state.selectedPages.has(pageIndex)) {
        state.selectedPages.delete(pageIndex);
        pageDiv.style.borderColor = '#ddd';
        pageDiv.style.background = '';
    } else {
        state.selectedPages.add(pageIndex);
        pageDiv.style.borderColor = '#0d6efd';
        pageDiv.style.background = '#e7f1ff';
    }
    updateSelectionInfo();
}

function selectAllPages() {
    const pdf = state.pdfFiles.find(p => p.id === state.currentPreviewId);
    if (!pdf) return;
    for (let i = 0; i < pdf.pageCount; i++) state.selectedPages.add(i);
    previewGrid.querySelectorAll('.preview-page').forEach(p => {
        p.style.borderColor = '#0d6efd';
        p.style.background = '#e7f1ff';
    });
    updateSelectionInfo();
}

function clearSelection() {
    state.selectedPages.clear();
    previewGrid.querySelectorAll('.preview-page').forEach(p => {
        p.style.borderColor = '#ddd';
        p.style.background = '';
    });
    updateSelectionInfo();
}

function updateSelectionInfo() {
    selectionInfo.textContent = state.selectedPages.size > 0 ? `已选择 ${state.selectedPages.size} 页` : '点击页面选择/取消';
}

function applySelection() {
    const input = document.querySelector(`.pages-input[data-id="${state.currentPreviewId}"]`);
    const pdf = state.pdfFiles.find(p => p.id === state.currentPreviewId);
    if (!input || !pdf) return;
    
    if (state.selectedPages.size === pdf.pageCount || state.selectedPages.size === 0) {
        input.value = '';
    } else {
        const sorted = Array.from(state.selectedPages).sort((a, b) => a - b);
        const result = [];
        let start = sorted[0], end = sorted[0];
        for (let i = 1; i <= sorted.length; i++) {
            if (i < sorted.length && sorted[i] === end + 1) {
                end = sorted[i];
            } else {
                result.push(start === end ? String(start + 1) : `${start + 1}-${end + 1}`);
                if (i < sorted.length) start = end = sorted[i];
            }
        }
        input.value = result.join(',');
    }
    previewModal.classList.add('hidden');
}

// 合并PDF
async function mergePDFs() {
    if (state.pdfFiles.length === 0) return;
    
    mergeBtn.disabled = true;
    progressEl.classList.remove('hidden');
    progressText.textContent = '准备中...';
    
    try {
        const mergedPdf = await PDFDocument.create();
        const pageConfigs = [];
        
        for (const pdf of state.pdfFiles) {
            const input = document.querySelector(`.pages-input[data-id="${pdf.id}"]`);
            const pages = parsePageRange(input ? input.value : '', pdf.pageCount);
            pageConfigs.push({ pdf, pages });
        }
        
        let processed = 0;
        const total = pageConfigs.reduce((sum, c) => sum + c.pages.length, 0);
        
        for (let i = 0; i < pageConfigs.length; i++) {
            const { pdf, pages } = pageConfigs[i];
            progressText.textContent = `处理: ${pdf.name} (${i + 1}/${pageConfigs.length})`;
            
            const srcDoc = await PDFDocument.load(pdf.arrayBuffer);
            const copiedPages = await mergedPdf.copyPages(srcDoc, pages);
            for (const page of copiedPages) {
                mergedPdf.addPage(page);
                processed++;
            }
        }
        
        progressText.textContent = '生成PDF...';
        const pdfBytes = await mergedPdf.save();
        
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `merged_${Date.now()}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        
        progressText.textContent = `完成！共合并 ${processed} 页`;
    } catch (err) {
        progressText.textContent = `错误: ${err.message}`;
    } finally {
        mergeBtn.disabled = false;
    }
}
