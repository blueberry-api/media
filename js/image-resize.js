// 使用 Pica 实现高质量图片缩放
(function() {
    const images = [];
    const listEl = document.getElementById('image-list');
    const optionsEl = document.getElementById('options');
    const resultsEl = document.getElementById('results');
    const picaInstance = window.pica ? window.pica() : new pica();

    Utils.setupUpload('upload-area', 'file-input', addImages);
    document.getElementById('resize-btn').addEventListener('click', resize);
    document.getElementById('width').addEventListener('input', updatePreview);
    document.getElementById('height').addEventListener('input', updatePreview);
    document.getElementById('keep-ratio').addEventListener('change', updatePreview);

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
        const targetW = parseInt(document.getElementById('width').value);
        const targetH = parseInt(document.getElementById('height').value);
        const keepRatio = document.getElementById('keep-ratio').checked;

        for (let i = 0; i < images.length; i++) {
            const previewEl = document.getElementById(`preview-${i}`);
            if (previewEl) previewEl.textContent = '计算中...';
        }

        for (let i = 0; i < images.length; i++) {
            try {
                const result = await resizeImage(images[i].file, targetW, targetH, keepRatio);
                const previewEl = document.getElementById(`preview-${i}`);
                if (previewEl) {
                    previewEl.textContent = `-> ${result.width}x${result.height} | ${Utils.formatSize(result.blob.size)}`;
                }
            } catch (e) {
                const previewEl = document.getElementById(`preview-${i}`);
                if (previewEl) previewEl.textContent = '';
            }
        }
    }

    async function resize() {
        const targetW = parseInt(document.getElementById('width').value);
        const targetH = parseInt(document.getElementById('height').value);
        const keepRatio = document.getElementById('keep-ratio').checked;
        resultsEl.innerHTML = '';

        for (const img of images) {
            const result = await resizeImage(img.file, targetW, targetH, keepRatio);
            renderResult(result, img.file);
        }
    }

    function resizeImage(file, targetW, targetH, keepRatio) {
        return new Promise(resolve => {
            const img = new Image();
            img.onload = async () => {
                let w = targetW, h = targetH;
                if (keepRatio) {
                    const ratio = Math.min(targetW / img.width, targetH / img.height);
                    w = Math.round(img.width * ratio);
                    h = Math.round(img.height * ratio);
                }

                const srcCanvas = document.createElement('canvas');
                srcCanvas.width = img.width;
                srcCanvas.height = img.height;
                srcCanvas.getContext('2d').drawImage(img, 0, 0);

                const destCanvas = document.createElement('canvas');
                destCanvas.width = w;
                destCanvas.height = h;

                await picaInstance.resize(srcCanvas, destCanvas, {
                    quality: 3,
                    alpha: true
                });

                destCanvas.toBlob(blob => {
                    resolve({ blob, width: w, height: h });
                }, 'image/png');
            };
            img.src = URL.createObjectURL(file);
        });
    }

    function renderResult(result, originalFile) {
        const filename = Utils.getBaseName(originalFile.name) + '_resized.png';
        const div = document.createElement('div');
        div.className = 'result-item';
        div.innerHTML = `
            <img src="${URL.createObjectURL(result.blob)}">
            <span>${result.width}x${result.height} | ${Utils.formatSize(result.blob.size)}</span>
            <button>下载</button>
        `;
        div.querySelector('button').onclick = () => Utils.download(result.blob, filename);
        resultsEl.appendChild(div);
    }
})();
