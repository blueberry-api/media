const Utils = {
    formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    },

    download(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    },

    getBaseName(filename) {
        return filename.replace(/\.[^/.]+$/, '');
    },

    setupUpload(areaId, inputId, onFiles, multiple = true) {
        const area = document.getElementById(areaId);
        const input = document.getElementById(inputId);

        area.addEventListener('click', () => input.click());
        area.addEventListener('dragover', e => { e.preventDefault(); });
        area.addEventListener('drop', e => {
            e.preventDefault();
            onFiles(e.dataTransfer.files);
        });
        input.addEventListener('change', e => onFiles(e.target.files));
    }
};
