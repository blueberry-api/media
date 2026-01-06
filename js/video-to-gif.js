(function() {
    let video, gifBlob;
    const workerCode = document.querySelector('script[src*="gif.worker"]');

    Utils.setupUpload('upload-area', 'file-input', files => {
        if (files[0]) loadVideo(files[0]);
    }, false);

    document.getElementById('convert-btn').addEventListener('click', convert);
    document.getElementById('download-btn').addEventListener('click', () => {
        if (gifBlob) Utils.download(gifBlob, 'output.gif');
    });

    function loadVideo(file) {
        video = document.getElementById('video');
        video.src = URL.createObjectURL(file);
        document.getElementById('editor').classList.remove('hidden');
        document.getElementById('result').classList.add('hidden');
    }

    async function convert() {
        const start = parseFloat(document.getElementById('start').value) || 0;
        const duration = parseFloat(document.getElementById('duration').value) || 3;
        const fps = parseInt(document.getElementById('fps').value) || 10;
        const width = parseInt(document.getElementById('width').value) || 480;

        const progressEl = document.getElementById('progress');
        const progressBar = document.getElementById('progress-bar');
        const progressText = document.getElementById('progress-text');
        progressEl.classList.remove('hidden');

        const aspectRatio = video.videoHeight / video.videoWidth;
        const height = Math.round(width * aspectRatio);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        // 创建内联Worker绕过file://限制
        const workerBlob = await fetch('../libs/gif.worker.js').then(r => r.blob());
        const workerUrl = URL.createObjectURL(workerBlob);

        const gif = new GIF({
            workers: 2,
            quality: 10,
            width: width,
            height: height,
            workerScript: workerUrl
        });

        const frameCount = Math.floor(duration * fps);
        const frameInterval = 1 / fps;

        for (let i = 0; i < frameCount; i++) {
            await seekVideo(video, start + i * frameInterval);
            ctx.drawImage(video, 0, 0, width, height);
            gif.addFrame(ctx, { copy: true, delay: frameInterval * 1000 });
            progressBar.value = (i + 1) / frameCount * 50;
            progressText.textContent = `捕获帧 ${i + 1}/${frameCount}`;
        }

        progressText.textContent = '生成GIF中...';

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

    function seekVideo(video, time) {
        return new Promise(resolve => {
            video.currentTime = time;
            video.onseeked = resolve;
        });
    }
})();
