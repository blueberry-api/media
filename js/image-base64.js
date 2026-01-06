(function() {
    let imageBlob = null;

    Utils.setupUpload('upload-area', 'file-input', files => {
        if (files[0]) toBase64(files[0]);
    }, false);

    document.getElementById('copy-btn').addEventListener('click', () => {
        const output = document.getElementById('base64-output');
        output.select();
        document.execCommand('copy');
    });

    document.getElementById('convert-btn').addEventListener('click', fromBase64);
    document.getElementById('download-btn').addEventListener('click', () => {
        if (imageBlob) Utils.download(imageBlob, 'image.png');
    });

    function toBase64(file) {
        const reader = new FileReader();
        reader.onload = () => {
            document.getElementById('base64-output').value = reader.result;
            document.getElementById('to-base64-result').classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }

    function fromBase64() {
        let base64 = document.getElementById('base64-input').value.trim();
        if (!base64) return;

        if (!base64.startsWith('data:')) {
            base64 = 'data:image/png;base64,' + base64;
        }

        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            canvas.getContext('2d').drawImage(img, 0, 0);
            canvas.toBlob(blob => {
                imageBlob = blob;
                document.getElementById('output').src = URL.createObjectURL(blob);
                document.getElementById('to-image-result').classList.remove('hidden');
            }, 'image/png');
        };
        img.onerror = () => alert('无效的Base64编码');
        img.src = base64;
    }
})();
