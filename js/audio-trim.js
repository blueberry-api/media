(function () {
    let audioFile = null;
    let outputBlob = null;
    let ffmpeg = null;

    Utils.setupUpload("upload-area", "file-input", (files) => {
        if (files[0]) loadAudio(files[0]);
    }, false);

    document.getElementById("trim-btn").addEventListener("click", trim);
    document.getElementById("download-btn").addEventListener("click", () => {
        const format = document.getElementById("format").value;
        if (outputBlob) Utils.download(outputBlob, "trimmed." + format);
    });

    function loadAudio(file) {
        audioFile = file;
        const audio = document.getElementById("audio");
        audio.src = URL.createObjectURL(file);
        audio.onloadedmetadata = () => {
            document.getElementById("duration").textContent = audio.duration.toFixed(2);
            document.getElementById("end").value = Math.min(10, audio.duration).toFixed(1);
        };
        document.getElementById("editor").classList.remove("hidden");
        document.getElementById("result").classList.add("hidden");
    }

    async function initFFmpeg() {
        if (ffmpeg) return ffmpeg;
        const { FFmpeg } = FFmpegWASM;
        ffmpeg = new FFmpeg();
        await ffmpeg.load({
            coreURL: "../libs/ffmpeg/ffmpeg-core.js",
            wasmURL: "../libs/ffmpeg/ffmpeg-core.wasm",
        });
        return ffmpeg;
    }

    async function trim() {
        if (!audioFile) return;

        const start = parseFloat(document.getElementById("start").value) || 0;
        const end = parseFloat(document.getElementById("end").value) || 10;
        const format = document.getElementById("format").value;
        const duration = end - start;

        const progressEl = document.getElementById("progress");
        const progressText = document.getElementById("progress-text");
        if (progressEl) {
            progressEl.classList.remove("hidden");
            progressText.textContent = "加载FFmpeg...";
        }

        try {
            const ff = await initFFmpeg();
            const { fetchFile } = FFmpegUtil;

            const inputName = "input" + getExt(audioFile.name);
            const outputName = "output." + format;

            await ff.writeFile(inputName, await fetchFile(audioFile));

            if (progressText) progressText.textContent = "裁剪中...";

            const args = ["-i", inputName, "-ss", String(start), "-t", String(duration)];
            if (format === "mp3") {
                args.push("-b:a", "192k");
            }
            args.push(outputName);

            await ff.exec(args);

            const data = await ff.readFile(outputName);
            outputBlob = new Blob([data.buffer], { type: format === "mp3" ? "audio/mp3" : "audio/wav" });

            await ff.deleteFile(inputName);
            await ff.deleteFile(outputName);

            document.getElementById("output").src = URL.createObjectURL(outputBlob);
            document.getElementById("result").classList.remove("hidden");
        } catch (e) {
            alert("裁剪失败: " + e.message);
        }
        if (progressEl) progressEl.classList.add("hidden");
    }

    function getExt(filename) {
        return "." + filename.split(".").pop().toLowerCase();
    }
})();
