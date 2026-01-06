// 使用 EXIF.js 读取图片元数据
(function() {
    let currentFile = null;

    Utils.setupUpload('upload-area', 'file-input', files => {
        if (files[0]) loadImage(files[0]);
    }, false);

    document.getElementById('remove-btn').addEventListener('click', removeExif);

    function loadImage(file) {
        currentFile = file;
        const preview = document.getElementById('preview');
        preview.src = URL.createObjectURL(file);
        
        document.getElementById('editor').classList.remove('hidden');
        
        EXIF.getData(file, function() {
            const allTags = EXIF.getAllTags(this);
            displayExif(allTags);
        });
    }

    function displayExif(tags) {
        const container = document.getElementById('exif-info');
        
        if (Object.keys(tags).length === 0) {
            container.innerHTML = '<p>未找到EXIF信息</p>';
            return;
        }

        const importantTags = [
            'Make', 'Model', 'DateTime', 'DateTimeOriginal',
            'ExposureTime', 'FNumber', 'ISOSpeedRatings',
            'FocalLength', 'GPSLatitude', 'GPSLongitude',
            'ImageWidth', 'ImageHeight', 'Software'
        ];

        let html = '<table style="width:100%;border-collapse:collapse;">';
        
        for (const tag of importantTags) {
            if (tags[tag] !== undefined) {
                let value = tags[tag];
                if (typeof value === 'object') value = JSON.stringify(value);
                html += `<tr><td style="border:1px solid #ddd;padding:4px;"><b>${tag}</b></td>
                         <td style="border:1px solid #ddd;padding:4px;">${value}</td></tr>`;
            }
        }

        html += '<tr><td colspan="2" style="padding:8px;"><b>全部标签:</b></td></tr>';
        for (const [key, value] of Object.entries(tags)) {
            if (!importantTags.includes(key)) {
                let v = typeof value === 'object' ? JSON.stringify(value) : value;
                if (String(v).length > 100) v = String(v).substring(0, 100) + '...';
                html += `<tr><td style="border:1px solid #ddd;padding:4px;">${key}</td>
                         <td style="border:1px solid #ddd;padding:4px;">${v}</td></tr>`;
            }
        }
        html += '</table>';
        
        container.innerHTML = html;
    }

    function removeExif() {
        if (!currentFile) return;

        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            canvas.getContext('2d').drawImage(img, 0, 0);
            
            canvas.toBlob(blob => {
                Utils.download(blob, Utils.getBaseName(currentFile.name) + '_no_exif.jpg');
            }, 'image/jpeg', 0.95);
        };
        img.src = URL.createObjectURL(currentFile);
    }
})();
