// PDF解锁工具
const { PDFDocument } = PDFLib;
pdfjsLib.GlobalWorkerOptions.workerSrc = '../libs/pdf.worker.min.js';

const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('file-input');
const fileInfo = document.getElementById('file-info');
const fileNameEl = document.getElementById('file-name');
const fileMeta = document.getElementById('file-meta');
const statusList = document.getElementById('status-list');
const unlockBtn = document.getElementById('unlock-btn');
const resultEl = document.getElementById('result');

let currentFile = null;
let currentArrayBuffer = null;

uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', e => e.preventDefault());
uploadArea.addEventListener('drop', e => {
    e.preventDefault();
    const file = Array.from(e.dataTransfer.files).find(f => f.type === 'application/pdf');
    if (file) loadPdf(file);
});
fileInput.addEventListener('change', e => { if (e.target.files[0]) loadPdf(e.target.files[0]); });
unlockBtn.addEventListener('click', unlockPdf);

async function loadPdf(file) {
    currentFile = file;
    resultEl.classList.add('hidden');
    
    try {
        currentArrayBuffer = await file.arrayBuffer();
        const pdfDoc = await pdfjsLib.getDocument({ data: currentArrayBuffer.slice(0) }).promise;
        const permissions = await pdfDoc.getPermissions();
        const pageCount = pdfDoc.numPages;
        
        fileNameEl.textContent = file.name;
        fileMeta.textContent = `${pageCount}页 | ${formatSize(file.size)}`;
        
        let hasRestrictions = false;
        let statusHtml = '';
        
        if (permissions === null) {
            statusHtml = '<div style="color:green;">✓ 此PDF没有权限限制</div>';
        } else {
            const checks = [
                { key: 'print', label: '打印' },
                { key: 'copy', label: '复制文本' },
                { key: 'modifyContents', label: '修改内容' },
                { key: 'modifyAnnotations', label: '添加注释' }
            ];
            for (const check of checks) {
                const allowed = permissions.includes(check.key);
                if (!allowed) hasRestrictions = true;
                statusHtml += `<div style="color:${allowed ? 'green' : 'red'};">${allowed ? '✓' : '✗'} ${check.label}: ${allowed ? '允许' : '禁止'}</div>`;
            }
        }
        
        statusList.innerHTML = statusHtml;
        fileInfo.classList.remove('hidden');
        unlockBtn.disabled = !hasRestrictions && permissions !== null;
        unlockBtn.textContent = hasRestrictions ? '解锁PDF' : '无需解锁';
        
    } catch (err) {
        if (err.name === 'PasswordException') {
            fileInfo.classList.remove('hidden');
            fileNameEl.textContent = file.name;
            fileMeta.textContent = formatSize(file.size);
            statusList.innerHTML = '<div style="color:red;">✗ 此PDF需要密码才能打开，无法解锁</div>';
            unlockBtn.disabled = true;
            unlockBtn.textContent = '无法解锁';
        } else {
            alert('无法读取PDF: ' + err.message);
        }
    }
}

async function unlockPdf() {
    if (!currentArrayBuffer) return;
    
    unlockBtn.disabled = true;
    unlockBtn.textContent = '处理中...';
    resultEl.classList.add('hidden');
    
    try {
        const srcDoc = await pdfjsLib.getDocument({ data: currentArrayBuffer.slice(0) }).promise;
        const newPdf = await PDFDocument.create();
        
        for (let i = 1; i <= srcDoc.numPages; i++) {
            const page = await srcDoc.getPage(i);
            const viewport = page.getViewport({ scale: 2 });
            
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
            
            const imgData = canvas.toDataURL('image/jpeg', 0.92);
            const imgBytes = await fetch(imgData).then(r => r.arrayBuffer());
            const img = await newPdf.embedJpg(imgBytes);
            
            const origViewport = page.getViewport({ scale: 1 });
            const newPage = newPdf.addPage([origViewport.width, origViewport.height]);
            newPage.drawImage(img, { x: 0, y: 0, width: origViewport.width, height: origViewport.height });
        }
        
        const pdfBytes = await newPdf.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = currentFile.name.replace('.pdf', '_unlocked.pdf');
        a.click();
        URL.revokeObjectURL(url);
        
        resultEl.style.background = '#d1e7dd';
        resultEl.style.color = '#0f5132';
        resultEl.textContent = '✓ 解锁成功！已下载无限制的PDF文件';
        resultEl.classList.remove('hidden');
        
    } catch (err) {
        resultEl.style.background = '#f8d7da';
        resultEl.style.color = '#842029';
        resultEl.textContent = '解锁失败: ' + err.message;
        resultEl.classList.remove('hidden');
    } finally {
        unlockBtn.disabled = false;
        unlockBtn.textContent = '解锁PDF';
    }
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
