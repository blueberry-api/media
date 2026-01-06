(function() {
    const picker = document.getElementById('color-picker');
    const preview = document.getElementById('color-preview');
    const hexInput = document.getElementById('hex');
    const rgbInput = document.getElementById('rgb');
    const hslInput = document.getElementById('hsl');
    const rgbaInput = document.getElementById('rgba');

    picker.addEventListener('input', () => updateFromHex(picker.value));
    hexInput.addEventListener('input', () => updateFromHex(hexInput.value));
    rgbInput.addEventListener('input', () => updateFromRgb(rgbInput.value));

    function updateFromHex(hex) {
        if (!/^#?[0-9a-f]{6}$/i.test(hex)) return;
        hex = hex.startsWith('#') ? hex : '#' + hex;

        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);

        updateAll(r, g, b, hex);
    }

    function updateFromRgb(rgb) {
        const match = rgb.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
        if (!match) return;

        const r = parseInt(match[1]);
        const g = parseInt(match[2]);
        const b = parseInt(match[3]);
        const hex = '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');

        updateAll(r, g, b, hex);
    }

    function updateAll(r, g, b, hex) {
        preview.style.background = hex;
        picker.value = hex;
        hexInput.value = hex;
        rgbInput.value = `rgb(${r}, ${g}, ${b})`;
        rgbaInput.value = `rgba(${r}, ${g}, ${b}, 1)`;

        const hsl = rgbToHsl(r, g, b);
        hslInput.value = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
    }

    function rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }

        return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
    }
})();
