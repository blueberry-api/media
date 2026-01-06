(function () {
    let player = null;
    let audioBuffer = null;
    let audioFile = null;
    let outputBlob = null;
    let ffmpeg = null;
    let volume, eq3, reverb, feedbackDelay;

    Utils.setupUpload("upload-area", "file-input", (files) => {
        if (files[0]) loadAudio(files[0]);
    }, false);

    const sliders = ["volume", "speed", "bass", "mid", "treble", "reverb", "delay"];
    sliders.forEach((id) => {
        const el = document.getElementById(id);
        el.addEventListener("input", () => {
            document.getElementById(id + "-val").textContent = el.value;
            updateEffects();
        });
    });

    document.getElementById("play-btn").addEventListener("click", play);
    document.getElementById("stop-btn").addEventListener("click", stop);
    document.getElementById("reset-btn").addEventListener("click", reset);
    document.getElementById("export-btn").addEventListener("click", exportAudio);
    document.getElementById("download-btn").addEventListener("click", () => {
        if (outputBlob) Utils.download(outputBlob, "processed.mp3");
    });

    async function loadAudio(file) {
        audioFile = file;
        document.getElementById("file-info").textContent = `${file.name} | ${Utils.formatSize(file.size)}`;
        document.getElementById("editor").classList.remove("hidden");
        document.getElementById("result").classList.add("hidden");

        await Tone.start();

        const arrayBuffer = await file.arrayBuffer();
        try {
            audioBuffer = await Tone.context.decodeAudioData(arrayBuffer);
        } catch (e) {
            alert("无法解码音频用于实时预览，但仍可导出处理后的音频");
            return;
        }

        volume = new Tone.Volume(0).toDestination();
        eq3 = new Tone.EQ3(0, 0, 0).connect(volume);
        reverb = new Tone.Reverb({ decay: 1.5, wet: 0 }).connect(eq3);
        feedbackDelay = new Tone.FeedbackDelay({ delayTime: 0.25, feedback: 0.3, wet: 0 }).connect(reverb);

        player = new Tone.Player(audioBuffer).connect(feedbackDelay);

        reset();
    }

    function updateEffects() {
        if (!player) return;
        volume.volume.value = parseFloat(document.getElementById("volume").value);
        player.playbackRate = parseFloat(document.getElementById("speed").value);
        eq3.low.value = parseFloat(document.getElementById("bass").value);
        eq3.mid.value = parseFloat(document.getElementById("mid").value);
        eq3.high.value = parseFloat(document.getElementById("treble").value);
        reverb.wet.value = parseFloat(document.getElementById("reverb").value) / 100;
        feedbackDelay.wet.value = parseFloat(document.getElementById("delay").value) / 100;
    }

    function play() {
        if (player && player.state !== "started") {
            player.start();
        }
    }

    function stop() {
        if (player) {
            player.stop();
        }
    }

    function reset() {
        document.getElementById("volume").value = 0;
        document.getElementById("speed").value = 1;
        document.getElementById("bass").value = 0;
        document.getElementById("mid").value = 0;
        document.getElementById("treble").value = 0;
        document.getElementById("reverb").value = 0;
        document.getElementById("delay").value = 0;
        sliders.forEach((id) => {
            document.getElementById(id + "-val").textContent = document.getElementById(id).value;
        });
        updateEffects();
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

    async function exportAudio() {
        if (!audioFile) return;

        const progressEl = document.getElementById("progress");
        const progressText = document.getElementById("progress-text");

        progressEl.classList.remove("hidden");
        progressText.textContent = "加载FFmpeg...";

        try {
            const ff = await initFFmpeg();
            const { fetchFile } = FFmpegUtil;

            const inputName = "input" + getExt(audioFile.name);
            const outputName = "output.mp3";

            await ff.writeFile(inputName, await fetchFile(audioFile));

            progressText.textContent = "处理中...";

            const speed = parseFloat(document.getElementById("speed").value);
            const volumeDb = parseFloat(document.getElementById("volume").value);
            const bass = parseFloat(document.getElementById("bass").value);
            const treble = parseFloat(document.getElementById("treble").value);

            const filters = [];
            if (speed !== 1) {
                filters.push(`atempo=${speed}`);
            }
            if (volumeDb !== 0) {
                filters.push(`volume=${volumeDb}dB`);
            }
            if (bass !== 0 || treble !== 0) {
                filters.push(`bass=g=${bass}:f=100,treble=g=${treble}:f=3000`);
            }

            const args = ["-i", inputName];
            if (filters.length > 0) {
                args.push("-af", filters.join(","));
            }
            args.push("-b:a", "192k", outputName);

            await ff.exec(args);

            const data = await ff.readFile(outputName);
            outputBlob = new Blob([data.buffer], { type: "audio/mp3" });

            await ff.deleteFile(inputName);
            await ff.deleteFile(outputName);

            document.getElementById("output").src = URL.createObjectURL(outputBlob);
            document.getElementById("result").classList.remove("hidden");
            progressText.textContent = "完成！";
        } catch (e) {
            alert("导出失败: " + e.message);
        }
        setTimeout(() => progressEl.classList.add("hidden"), 1500);
    }

    function getExt(filename) {
        return "." + filename.split(".").pop().toLowerCase();
    }
})();
