(function() {
    let imageFile = null;
    let icoBlob = null;

    Utils.setupUpload('upload-area', 'file-input', files => {
        if (files[0]) loadImage(files[0]);
    }, false);

    document.getElementById('convert-btn').addEventListener('click', convert);
    document.getElementById('download-btn').addEventListener('click', () => {
        if (icoBlob) Utils.download(icoBlob, 'favicon.ico');
    });

    function loadImage(file) {
        imageFile = file;
        document.getElementById('preview').src = URL.createObjectURL(file);
        document.getElementById('editor').classList.remove('hidden');
        document.getElementById('result').classList.add('hidden');
    }

    function convert() {
        const size = parseInt(document.getElementById('size').value);

        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            canvas.getContext('2d').drawImage(img, 0, 0, size, size);

            canvas.toBlob(pngBlob => {
                pngBlob.arrayBuffer().then(buffer => {
                    icoBlob = createIco(new Uint8Array(buffer), size);
                    document.getElementById('result').classList.remove('hidden');
                });
            }, 'image/png');
        };
        img.src = URL.createObjectURL(imageFile);
    }

    function createIco(pngData, size) {
        const header = new Uint8Array([
            0, 0, 1, 0, 1, 0,
            size > 255 ? 0 : size,
            size > 255 ? 0 : size,
            0, 0, 1, 0, 32, 0,
            pngData.length & 255,
            (pngData.length >> 8) & 255,
            (pngData.length >> 16) & 255,
            (pngData.length >> 24) & 255,
            22, 0, 0, 0
        ]);

        const ico = new Uint8Array(header.length + pngData.length);
        ico.set(header);
        ico.set(pngData, header.length);

        return new Blob([ico], { type: 'image/x-icon' });
    }
})();
