(function() {
    let svgUrl = null;
    let outputBlob = null;

    Utils.setupUpload('upload-area', 'file-input', files => {
        if (files[0]) loadSvg(files[0]);
    }, false);

    document.getElementById('convert-btn').addEventListener('click', convert);
    document.getElementById('download-btn').addEventListener('click', () => {
        const format = document.getElementById('format').value;
        if (outputBlob) Utils.download(outputBlob, 'image.' + format);
    });

    function loadSvg(file) {
        svgUrl = URL.createObjectURL(file);
        document.getElementById('preview').src = svgUrl;
        document.getElementById('editor').classList.remove('hidden');
        document.getElementById('result').classList.add('hidden');
    }

    function convert() {
        const width = parseInt(document.getElementById('width').value) || 512;
        const height = parseInt(document.getElementById('height').value) || 512;
        const format = document.getElementById('format').value;

        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            if (format === 'jpeg') {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, width, height);
            }

            ctx.drawImage(img, 0, 0, width, height);
            const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
            canvas.toBlob(blob => {
                outputBlob = blob;
                document.getElementById('output').src = URL.createObjectURL(blob);
                document.getElementById('result').classList.remove('hidden');
            }, mime, 0.9);
        };
        img.src = svgUrl;
    }
})();
