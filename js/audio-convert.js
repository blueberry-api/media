// 使用 ffmpeg.wasm 实现音频转换
(function () {
    let audioFile = null;
    let outputBlob = null;
    let ffmpeg = null;

    Utils.setupUpload(
        "upload-area",
        "file-input",
        (files) => {
            if (files[0]) loadAudio(files[0]);
        },
        false
    );

    document.getElementById("convert-btn").addEventListener("click", convert);
    document.getElementById("download-btn").addEventListener("click", () => {
        const format = document.getElementById("format").value;
        if (outputBlob) Utils.download(outputBlob, "audio." + format);
    });

    function loadAudio(file) {
        audioFile = file;
        document.getElementById("audio").src = URL.createObjectURL(file);
        document.getElementById("file-info").textContent = `${file.name} | ${Utils.formatSize(file.size)}`;
        document.getElementById("editor").classList.remove("hidden");
        document.getElementById("result").classList.add("hidden");
    }

    async function initFFmpeg() {
        if (ffmpeg) return ffmpeg;
        
        const { FFmpeg } = FFmpegWASM;
        const { fetchFile } = FFmpegUtil;
        
        ffmpeg = new FFmpeg();
        ffmpeg.on("progress", ({ progress }) => {
            const progressBar = document.getElementById("progress-bar");
            if (progressBar) progressBar.value = Math.round(progress * 100);
        });
        
        await ffmpeg.load({
            coreURL: "../libs/ffmpeg/ffmpeg-core.js",
            wasmURL: "../libs/ffmpeg/ffmpeg-core.wasm",
        });
        
        return ffmpeg;
    }

    async function convert() {
        const format = document.getElementById("format").value;
        const bitrate = document.getElementById("bitrate").value;
        const progressEl = document.getElementById("progress");
        const progressBar = document.getElementById("progress-bar");
        const progressText = document.getElementById("progress-text");

        progressEl.classList.remove("hidden");
        progressText.textContent = "加载FFmpeg...";
        progressBar.value = 0;

        try {
            const ff = await initFFmpeg();
            const { fetchFile } = FFmpegUtil;
            
            progressText.textContent = "读取文件...";
            const inputName = "input" + getExtension(audioFile.name);
            const outputName = "output." + format;
            
            await ff.writeFile(inputName, await fetchFile(audioFile));
            
            progressText.textContent = "转换中...";
            
            // 构建ffmpeg命令
            const args = ["-i", inputName];
            if (format === "mp3") {
                args.push("-b:a", bitrate + "k", "-f", "mp3");
            } else {
                args.push("-f", "wav");
            }
            args.push(outputName);
            
            await ff.exec(args);
            
            progressText.textContent = "读取输出...";
            const data = await ff.readFile(outputName);
            outputBlob = new Blob([data.buffer], { type: format === "mp3" ? "audio/mp3" : "audio/wav" });
            
            // 清理
            await ff.deleteFile(inputName);
            await ff.deleteFile(outputName);

            document.getElementById("output").src = URL.createObjectURL(outputBlob);
            document.getElementById("output-info").textContent = Utils.formatSize(outputBlob.size);
            document.getElementById("result").classList.remove("hidden");
            progressBar.value = 100;
            progressText.textContent = "完成！";
        } catch (e) {
            console.error(e);
            alert("转换失败: " + e.message);
        }
        setTimeout(() => progressEl.classList.add("hidden"), 1500);
    }

    function getExtension(filename) {
        const ext = filename.split(".").pop().toLowerCase();
        return "." + ext;
    }
})();
