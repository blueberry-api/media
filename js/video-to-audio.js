(function () {
    let videoFile = null;
    let audioBlob = null;
    let ffmpeg = null;

    Utils.setupUpload("upload-area", "file-input", (files) => {
        if (files[0]) loadVideo(files[0]);
    }, false);

    document.getElementById("convert-btn").addEventListener("click", convert);
    document.getElementById("download-btn").addEventListener("click", () => {
        const format = document.getElementById("format").value;
        if (audioBlob) Utils.download(audioBlob, "audio." + format);
    });

    function loadVideo(file) {
        videoFile = file;
        document.getElementById("video").src = URL.createObjectURL(file);
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

    async function convert() {
        if (!videoFile) return;

        const format = document.getElementById("format").value;
        const progressEl = document.getElementById("progress");
        const progressText = document.getElementById("progress-text");

        progressEl.classList.remove("hidden");
        progressText.textContent = "加载FFmpeg...";

        try {
            const ff = await initFFmpeg();
            const { fetchFile } = FFmpegUtil;

            const inputName = "input" + getExt(videoFile.name);
            const outputName = "output." + format;

            progressText.textContent = "读取文件...";
            await ff.writeFile(inputName, await fetchFile(videoFile));

            progressText.textContent = "提取音频...";
            const args = ["-i", inputName, "-vn"];
            if (format === "mp3") {
                args.push("-b:a", "192k");
            }
            args.push(outputName);

            await ff.exec(args);

            const data = await ff.readFile(outputName);
            audioBlob = new Blob([data.buffer], { type: format === "mp3" ? "audio/mp3" : "audio/wav" });

            await ff.deleteFile(inputName);
            await ff.deleteFile(outputName);

            document.getElementById("output").src = URL.createObjectURL(audioBlob);
            document.getElementById("result").classList.remove("hidden");
            progressText.textContent = "完成！";
        } catch (e) {
            alert("提取失败: " + e.message);
        }
        setTimeout(() => progressEl.classList.add("hidden"), 1500);
    }

    function getExt(filename) {
        return "." + filename.split(".").pop().toLowerCase();
    }
})();
