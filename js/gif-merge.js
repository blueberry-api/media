(function() {
    const images = [];
    const listEl = document.getElementById('image-list');
    const optionsEl = document.getElementById('options');
    let gifBlob = null;

    Utils.setupUpload('upload-area', 'file-input', addImages);
    document.getElementById('convert-btn').addEventListener('click', convert);
    document.getElementById('download-btn').addEventListener('click', () => {
        if (gifBlob) Utils.download(gifBlob, 'animation.gif');
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
                <span>${i + 1}</span>
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

    async function convert() {
        if (images.length < 2) {
            alert('至少需要2张图片');
            return;
        }

        const delay = parseInt(document.getElementById('delay').value) || 200;
        const width = parseInt(document.getElementById('width').value) || 400;
        const progressEl = document.getElementById('progress');
        const progressBar = document.getElementById('progress-bar');

        progressEl.classList.remove('hidden');

        const workerBlob = await fetch('../libs/gif.worker.js').then(r => r.blob());
        const workerUrl = URL.createObjectURL(workerBlob);

        const firstImg = await loadImg(images[0].file);
        const aspectRatio = firstImg.height / firstImg.width;
        const height = Math.round(width * aspectRatio);

        const gif = new GIF({
            workers: 2,
            quality: 10,
            width: width,
            height: height,
            workerScript: workerUrl
        });

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        for (let i = 0; i < images.length; i++) {
            const img = await loadImg(images[i].file);
            ctx.clearRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            gif.addFrame(ctx, { copy: true, delay: delay });
            progressBar.value = (i + 1) / images.length * 50;
        }

        gif.on('progress', p => { progressBar.value = 50 + p * 50; });
        gif.on('finished', blob => {
            gifBlob = blob;
            document.getElementById('output').src = URL.createObjectURL(blob);
            document.getElementById('result').classList.remove('hidden');
            progressEl.classList.add('hidden');
            URL.revokeObjectURL(workerUrl);
        });

        gif.render();
    }

    function loadImg(file) {
        return new Promise(resolve => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.src = URL.createObjectURL(file);
        });
    }
})();
