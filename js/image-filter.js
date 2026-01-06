(function() {
    let originalImg = null;
    let currentBlob = null;
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    Utils.setupUpload('upload-area', 'file-input', files => {
        if (files[0]) loadImage(files[0]);
    }, false);

    ['brightness', 'contrast', 'saturate', 'grayscale', 'blur', 'invert'].forEach(id => {
        document.getElementById(id).addEventListener('input', render);
    });

    document.getElementById('reset-btn').addEventListener('click', reset);
    document.getElementById('download-btn').addEventListener('click', download);

    function loadImage(file) {
        const img = new Image();
        img.onload = () => {
            originalImg = img;
            canvas.width = img.width;
            canvas.height = img.height;
            document.getElementById('editor').classList.remove('hidden');
            reset();
        };
        img.src = URL.createObjectURL(file);
    }

    function reset() {
        document.getElementById('brightness').value = 100;
        document.getElementById('contrast').value = 100;
        document.getElementById('saturate').value = 100;
        document.getElementById('grayscale').value = 0;
        document.getElementById('blur').value = 0;
        document.getElementById('invert').value = 0;
        render();
    }

    function render() {
        if (!originalImg) return;

        const brightness = document.getElementById('brightness').value;
        const contrast = document.getElementById('contrast').value;
        const saturate = document.getElementById('saturate').value;
        const grayscale = document.getElementById('grayscale').value;
        const blur = document.getElementById('blur').value;
        const invert = document.getElementById('invert').value;

        ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%) grayscale(${grayscale}%) blur(${blur}px) invert(${invert}%)`;
        ctx.drawImage(originalImg, 0, 0);

        canvas.toBlob(blob => { currentBlob = blob; }, 'image/png');
    }

    function download() {
        if (currentBlob) Utils.download(currentBlob, 'filtered.png');
    }
})();
