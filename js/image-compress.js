// 使用 browser-image-compression 实现图片压缩
(function() {
    const images = [];
    const listEl = document.getElementById('image-list');
    const optionsEl = document.getElementById('options');
    const resultsEl = document.getElementById('results');
    const qualitySlider = document.getElementById('quality');
    const qualityVal = document.getElementById('quality-val');

    Utils.setupUpload('upload-area', 'file-input', addImages);

    qualitySlider.addEventListener('input', () => {
        qualityVal.textContent = qualitySlider.value;
        updatePreview();
    });

    document.getElementById('max-width').addEventListener('input', updatePreview);
    document.getElementById('compress-btn').addEventListener('click', compress);

    function addImages(files) {
        for (const file of files) {
            if (file.type.startsWith('image/')) {
                images.push({ file, url: URL.createObjectURL(file) });
            }
        }
        renderList();
        updatePreview();
    }

    function renderList() {
        if (images.length === 0) {
            listEl.innerHTML = '';
            optionsEl.classList.add('hidden');
            return;
        }
        optionsEl.classList.remove('hidden');
        listEl.innerHTML = images.map((img, i) => `
            <div class="image-item">
                <img src="${img.url}">
                <span class="size-info">${Utils.formatSize(img.file.size)}</span>
                <span class="preview-size" id="preview-${i}"></span>
                <button data-i="${i}">x</button>
            </div>
        `).join('');
        listEl.querySelectorAll('button').forEach(btn => {
            btn.onclick = () => {
                images.splice(parseInt(btn.dataset.i), 1);
                renderList();
                updatePreview();
            };
        });
    }

    async function updatePreview() {
        if (images.length === 0) return;
        const quality = qualitySlider.value / 100;
        const maxWidth = parseInt(document.getElementById('max-width').value) || 0;

        for (let i = 0; i < images.length; i++) {
            const previewEl = document.getElementById(`preview-${i}`);
            if (previewEl) previewEl.textContent = '计算中...';
        }

        for (let i = 0; i < images.length; i++) {
            try {
                const options = {
                    maxSizeMB: 10,
                    maxWidthOrHeight: maxWidth > 0 ? maxWidth : undefined,
                    useWebWorker: true,
                    initialQuality: quality
                };
                const compressedFile = await imageCompression(images[i].file, options);
                const previewEl = document.getElementById(`preview-${i}`);
                if (previewEl) {
                    const saved = ((1 - compressedFile.size / images[i].file.size) * 100).toFixed(1);
                    previewEl.textContent = `-> ${Utils.formatSize(compressedFile.size)} (-${saved}%)`;
                }
            } catch (e) {
                const previewEl = document.getElementById(`preview-${i}`);
                if (previewEl) previewEl.textContent = '';
            }
        }
    }

    async function compress() {
        const quality = qualitySlider.value / 100;
        const maxWidth = parseInt(document.getElementById('max-width').value) || 0;
        resultsEl.innerHTML = '';

        for (const img of images) {
            try {
                const options = {
                    maxSizeMB: 10,
                    maxWidthOrHeight: maxWidth > 0 ? maxWidth : undefined,
                    useWebWorker: true,
                    initialQuality: quality
                };
                
                const compressedFile = await imageCompression(img.file, options);
                renderResult(compressedFile, img.file);
            } catch (e) {
                console.error('压缩失败:', e);
            }
        }
    }

    function renderResult(compressedFile, originalFile) {
        const filename = Utils.getBaseName(originalFile.name) + '_compressed.' + 
            (compressedFile.type.includes('png') ? 'png' : 'jpg');
        const saved = ((1 - compressedFile.size / originalFile.size) * 100).toFixed(1);
        const div = document.createElement('div');
        div.className = 'result-item';
        div.innerHTML = `
            <img src="${URL.createObjectURL(compressedFile)}">
            <span>${Utils.formatSize(originalFile.size)} -> ${Utils.formatSize(compressedFile.size)} (节省${saved}%)</span>
            <button>下载</button>
        `;
        div.querySelector('button').onclick = () => Utils.download(compressedFile, filename);
        resultsEl.appendChild(div);
    }
})();
