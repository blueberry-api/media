(function() {
    const video = document.getElementById('video');
    const resultsEl = document.getElementById('results');
    const screenshots = [];

    Utils.setupUpload('upload-area', 'file-input', files => {
        if (files[0]) loadVideo(files[0]);
    }, false);

    video.addEventListener('timeupdate', () => {
        document.getElementById('current-time').textContent = video.currentTime.toFixed(2);
    });

    document.getElementById('capture-btn').addEventListener('click', capture);

    function loadVideo(file) {
        video.src = URL.createObjectURL(file);
        document.getElementById('editor').classList.remove('hidden');
        resultsEl.innerHTML = '';
        screenshots.length = 0;
    }

    function capture() {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);

        canvas.toBlob(blob => {
            const time = video.currentTime.toFixed(2);
            screenshots.push({ blob, time });
            renderResult(blob, time);
        }, 'image/png');
    }

    function renderResult(blob, time) {
        const div = document.createElement('div');
        div.className = 'result-item';
        div.innerHTML = `
            <img src="${URL.createObjectURL(blob)}">
            <span>${time}s | ${Utils.formatSize(blob.size)}</span>
            <button>下载</button>
        `;
        div.querySelector('button').onclick = () => Utils.download(blob, `screenshot_${time}s.png`);
        resultsEl.appendChild(div);
    }
})();
