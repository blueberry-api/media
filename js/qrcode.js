(function() {
    const canvas = document.getElementById('qr-canvas');
    let qrBlob = null;

    document.getElementById('generate-btn').addEventListener('click', generate);
    document.getElementById('download-qr').addEventListener('click', () => {
        if (qrBlob) Utils.download(qrBlob, 'qrcode.png');
    });

    Utils.setupUpload('upload-area', 'file-input', files => {
        if (files[0]) scan(files[0]);
    }, false);

    function generate() {
        const text = document.getElementById('qr-text').value;
        if (!text) return;

        const size = parseInt(document.getElementById('qr-size').value) || 200;
        const qr = qrcode(0, 'M');
        qr.addData(text);
        qr.make();

        const moduleCount = qr.getModuleCount();
        const cellSize = Math.floor(size / moduleCount);
        const actualSize = cellSize * moduleCount;

        canvas.width = actualSize;
        canvas.height = actualSize;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, actualSize, actualSize);

        ctx.fillStyle = '#000000';
        for (let row = 0; row < moduleCount; row++) {
            for (let col = 0; col < moduleCount; col++) {
                if (qr.isDark(row, col)) {
                    ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
                }
            }
        }

        canvas.toBlob(blob => {
            qrBlob = blob;
            document.getElementById('qr-result').classList.remove('hidden');
        }, 'image/png');
    }

    function scan(file) {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, canvas.width, canvas.height);

            if (code) {
                document.getElementById('scan-output').value = code.data;
                document.getElementById('scan-result').classList.remove('hidden');
            } else {
                alert('未识别到二维码');
            }
        };
        img.src = URL.createObjectURL(file);
    }
})();
