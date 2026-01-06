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
    document.getElementById('format').addEventListener('change', updatePreview);
    document.getElementById('convert-btn').addEventListener('click', convert);

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
        const format = document.getElementById('format').value;
        const quality = qualitySlider.value / 100;

        for (let i = 0; i < images.length; i++) {
            const previewEl = document.getElementById(`preview-${i}`);
            if (previewEl) previewEl.textContent = '计算中...';
        }

        for (let i = 0; i < images.length; i++) {
            const result = await convertImage(images[i].file, format, quality);
            const previewEl = document.getElementById(`preview-${i}`);
            if (previewEl) {
                const diff = ((result.blob.size / images[i].file.size - 1) * 100).toFixed(1);
                const diffText = diff >= 0 ? `+${diff}%` : `${diff}%`;
                previewEl.textContent = `-> ${Utils.formatSize(result.blob.size)} (${diffText})`;
            }
        }
    }

    async function convert() {
        const format = document.getElementById('format').value;
        const quality = qualitySlider.value / 100;
        resultsEl.innerHTML = '';

        for (const img of images) {
            const result = await convertImage(img.file, format, quality);
            renderResult(result, img.file.name, format);
        }
    }

    function convertImage(file, format, quality) {
        return new Promise(resolve => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                canvas.getContext('2d').drawImage(img, 0, 0);
                const mime = format === 'png' ? 'image/png' : format === 'webp' ? 'image/webp' : 'image/jpeg';
                canvas.toBlob(blob => resolve({ blob, width: img.width, height: img.height }), mime, quality);
            };
            img.src = URL.createObjectURL(file);
        });
    }

    function renderResult(result, name, format) {
        const filename = Utils.getBaseName(name) + '.' + format;
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
