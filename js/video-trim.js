(function () {
    let videoFile = null;
    let outputBlob = null;
    let ffmpeg = null;

    Utils.setupUpload("upload-area", "file-input", (files) => {
        if (files[0]) loadVideo(files[0]);
    }, false);

    document.getElementById("trim-btn").addEventListener("click", trim);
    document.getElementById("download-btn").addEventListener("click", () => {
        if (outputBlob) Utils.download(outputBlob, "trimmed.mp4");
    });

    function loadVideo(file) {
        videoFile = file;
        const video = document.getElementById("video");
        video.src = URL.createObjectURL(file);
        video.onloadedmetadata = () => {
            document.getElementById("duration").textContent = video.duration.toFixed(2);
            document.getElementById("end").value = Math.min(10, video.duration).toFixed(1);
        };
        document.getElementById("editor").classList.remove("hidden");
        document.getElementById("result").classList.add("hidden");
    }

    async function initFFmpeg() {
        if (ffmpeg) return ffmpeg;
        const { FFmpeg } = FFmpegWASM;
        ffmpeg = new FFmpeg();
        ffmpeg.on("progress", ({ progress }) => {
            const bar = document.getElementById("progress-bar");
            if (bar) bar.value = Math.round(progress * 100);
        });
        await ffmpeg.load({
            coreURL: "../libs/ffmpeg/ffmpeg-core.js",
            wasmURL: "../libs/ffmpeg/ffmpeg-core.wasm",
        });
        return ffmpeg;
    }

    async function trim() {
        if (!videoFile) return;

        const start = parseFloat(document.getElementById("start").value) || 0;
        const end = parseFloat(document.getElementById("end").value) || 10;
        const duration = end - start;

        const progressEl = document.getElementById("progress");
        const progressText = document.getElementById("progress-text");

        progressEl.classList.remove("hidden");
        progressText.textContent = "加载FFmpeg...";

        try {
            const ff = await initFFmpeg();
            const { fetchFile } = FFmpegUtil;

            const inputName = "input" + getExt(videoFile.name);
            const outputName = "output.mp4";

            progressText.textContent = "读取文件...";
            await ff.writeFile(inputName, await fetchFile(videoFile));

            progressText.textContent = "裁剪中...";
            await ff.exec(["-i", inputName, "-ss", String(start), "-t", String(duration), "-c", "copy", outputName]);

            const data = await ff.readFile(outputName);
            outputBlob = new Blob([data.buffer], { type: "video/mp4" });

            await ff.deleteFile(inputName);
            await ff.deleteFile(outputName);

            document.getElementById("output").src = URL.createObjectURL(outputBlob);
            document.getElementById("result").classList.remove("hidden");
            progressText.textContent = "完成！";
        } catch (e) {
            alert("裁剪失败: " + e.message);
        }
        setTimeout(() => progressEl.classList.add("hidden"), 1500);
    }

    function getExt(filename) {
        return "." + filename.split(".").pop().toLowerCase();
    }
})();
