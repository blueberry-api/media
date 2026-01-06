(function() {
    const images = [];
    const listEl = document.getElementById('image-list');
    const optionsEl = document.getElementById('options');
    const resultsEl = document.getElementById('results');

    Utils.setupUpload('upload-area', 'file-input', addImages);
    document.getElementById('apply-btn').addEventListener('click', apply);
    document.getElementById('opacity').addEventListener('input', e => {
        document.getElementById('opacity-val').textContent = e.target.value + '%';
    });

    function addImages(files) {
        for (const file of files) {
            if (file.type.startsWith('image/')) {
                images.push({ file, url: URL.createObjectURL(file) });
            }
        }
        renderList();
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
                <button data-i="${i}">x</button>
            </div>
        `).join('');
        listEl.querySelectorAll('button').forEach(btn => {
            btn.onclick = () => {
                images.splice(parseInt(btn.dataset.i), 1);
                renderList();
            };
        });
    }

    async function apply() {
        const text = document.getElementById('text').value || 'Watermark';
        const fontSize = parseInt(document.getElementById('font-size').value) || 24;
        const color = document.getElementById('color').value;
        const opacity = parseInt(document.getElementById('opacity').value) / 100;
        const position = document.getElementById('position').value;

        resultsEl.innerHTML = '';
        for (const img of images) {
            const result = await addWatermark(img.file, text, fontSize, color, opacity, position);
            renderResult(result, img.file);
        }
    }

    function addWatermark(file, text, fontSize, color, opacity, position) {
        return new Promise(resolve => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);

                ctx.font = `${fontSize}px Arial`;
                ctx.fillStyle = color;
                ctx.globalAlpha = opacity;

                const metrics = ctx.measureText(text);
                const padding = 20;
                let x, y;

                switch (position) {
                    case 'top-left': x = padding; y = fontSize + padding; break;
                    case 'top-right': x = img.width - metrics.width - padding; y = fontSize + padding; break;
                    case 'bottom-left': x = padding; y = img.height - padding; break;
                    case 'bottom-right': x = img.width - metrics.width - padding; y = img.height - padding; break;
                    default: x = (img.width - metrics.width) / 2; y = img.height / 2;
                }

                ctx.fillText(text, x, y);
                canvas.toBlob(blob => resolve({ blob, width: img.width, height: img.height }), 'image/png');
            };
            img.src = URL.createObjectURL(file);
        });
    }

    function renderResult(result, originalFile) {
        const filename = Utils.getBaseName(originalFile.name) + '_watermark.png';
        const div = document.createElement('div');
        div.className = 'result-item';
        div.innerHTML = `
            <img src="${URL.createObjectURL(result.blob)}">
            <span>${Utils.formatSize(result.blob.size)}</span>
            <button>下载</button>
        `;
        div.querySelector('button').onclick = () => Utils.download(result.blob, filename);
        resultsEl.appendChild(div);
    }
})();
