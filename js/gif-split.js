(function() {
    const resultsEl = document.getElementById('results');
    const frames = [];

    Utils.setupUpload('upload-area', 'file-input', files => {
        if (files[0]) splitGif(files[0]);
    }, false);

    document.getElementById('download-all-btn').addEventListener('click', downloadAll);

    async function splitGif(file) {
        const progressEl = document.getElementById('progress');
        const progressText = document.getElementById('progress-text');
        progressEl.classList.remove('hidden');
        progressText.textContent = '解析GIF中...';
        resultsEl.innerHTML = '';
        frames.length = 0;

        const buffer = await file.arrayBuffer();
        const gif = parseGIF(new Uint8Array(buffer));
        const gifFrames = decompressFrames(gif, true);

        progressText.textContent = `共${gifFrames.length}帧，正在渲染...`;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        for (let i = 0; i < gifFrames.length; i++) {
            const frame = gifFrames[i];
            canvas.width = frame.dims.width;
            canvas.height = frame.dims.height;

            const imageData = new ImageData(
                new Uint8ClampedArray(frame.patch),
                frame.dims.width,
                frame.dims.height
            );
            ctx.putImageData(imageData, 0, 0);

            const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
            frames.push(blob);
            renderFrame(blob, i);
        }

        progressEl.classList.add('hidden');
        document.getElementById('download-all').classList.remove('hidden');
    }

    function renderFrame(blob, index) {
        const div = document.createElement('div');
        div.className = 'result-item';
        div.innerHTML = `
            <img src="${URL.createObjectURL(blob)}">
            <span>帧${index + 1} | ${Utils.formatSize(blob.size)}</span>
            <button>下载</button>
        `;
        div.querySelector('button').onclick = () => Utils.download(blob, `frame_${index + 1}.png`);
        resultsEl.appendChild(div);
    }

    async function downloadAll() {
        const zip = new JSZip();
        frames.forEach((blob, i) => {
            zip.file(`frame_${i + 1}.png`, blob);
        });
        const content = await zip.generateAsync({ type: 'blob' });
        Utils.download(content, 'frames.zip');
    }
})();
