(function() {
    let originalImg = null;
    let currentBlob = null;
    let rotation = 0;
    let flipH = false;
    let flipV = false;

    Utils.setupUpload('upload-area', 'file-input', files => {
        if (files[0]) loadImage(files[0]);
    }, false);

    document.getElementById('rotate-left').addEventListener('click', () => { rotation -= 90; render(); });
    document.getElementById('rotate-right').addEventListener('click', () => { rotation += 90; render(); });
    document.getElementById('flip-h').addEventListener('click', () => { flipH = !flipH; render(); });
    document.getElementById('flip-v').addEventListener('click', () => { flipV = !flipV; render(); });
    document.getElementById('download-btn').addEventListener('click', download);

    function loadImage(file) {
        const img = new Image();
        img.onload = () => {
            originalImg = img;
            rotation = 0;
            flipH = false;
            flipV = false;
            document.getElementById('editor').classList.remove('hidden');
            render();
        };
        img.src = URL.createObjectURL(file);
    }

    function render() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const rad = (rotation % 360) * Math.PI / 180;
        const isRotated = Math.abs(rotation % 180) === 90;

        canvas.width = isRotated ? originalImg.height : originalImg.width;
        canvas.height = isRotated ? originalImg.width : originalImg.height;

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(rad);
        ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
        ctx.drawImage(originalImg, -originalImg.width / 2, -originalImg.height / 2);

        canvas.toBlob(blob => {
            currentBlob = blob;
            document.getElementById('preview').src = URL.createObjectURL(blob);
        }, 'image/png');
    }

    function download() {
        if (currentBlob) Utils.download(currentBlob, 'rotated.png');
    }
})();
