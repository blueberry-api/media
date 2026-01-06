// 使用 Cropper.js 实现专业裁剪
(function() {
    let cropper = null;
    let croppedBlob = null;

    Utils.setupUpload('upload-area', 'file-input', files => {
        if (files[0]) loadImage(files[0]);
    }, false);

    document.getElementById('crop-btn').addEventListener('click', crop);
    document.getElementById('download-btn').addEventListener('click', download);

    function loadImage(file) {
        const img = document.getElementById('preview-img');
        img.src = URL.createObjectURL(file);
        
        img.onload = () => {
            document.getElementById('editor').classList.remove('hidden');
            document.getElementById('result').classList.add('hidden');
            
            if (cropper) cropper.destroy();
            
            cropper = new Cropper(img, {
                aspectRatio: NaN,
                viewMode: 1,
                autoCropArea: 0.8,
                responsive: true
            });
        };
    }

    function crop() {
        if (!cropper) return;
        
        const canvas = cropper.getCroppedCanvas();
        canvas.toBlob(blob => {
            croppedBlob = blob;
            document.getElementById('output').src = URL.createObjectURL(blob);
            document.getElementById('output-info').textContent = 
                `${canvas.width}x${canvas.height} | ${Utils.formatSize(blob.size)}`;
            document.getElementById('result').classList.remove('hidden');
        }, 'image/png');
    }

    function download() {
        if (croppedBlob) Utils.download(croppedBlob, 'cropped.png');
    }
})();
