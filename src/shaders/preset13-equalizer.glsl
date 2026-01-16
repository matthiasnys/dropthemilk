// Preset 13: Classic Equalizer
uniform float u_time;
uniform float u_bass;
uniform float u_mid;
uniform float u_treble;
uniform float u_beat;
uniform vec2 u_resolution;
uniform sampler2D u_video;

#define PI 3.14159265359
#define NUM_BARS 32.0

float hash(float n) {
    return fract(sin(n) * 43758.5453);
}

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    vec2 screenUV = gl_FragCoord.xy / u_resolution.xy;
    float t = u_time;

    // Subtle camera sway
    vec2 pan = vec2(sin(t * 0.1) * 0.02, cos(t * 0.08) * 0.01);
    uv += pan;

    // Dark background with subtle gradient
    vec3 bgColor = mix(vec3(0.02, 0.02, 0.05), vec3(0.05, 0.02, 0.08), uv.y);
    vec3 color = bgColor;

    // Grid lines (subtle)
    float gridX = smoothstep(0.002, 0.0, abs(fract(uv.x * NUM_BARS) - 0.5) - 0.48);
    float gridY = smoothstep(0.001, 0.0, abs(fract(uv.y * 20.0) - 0.5) - 0.49);
    color += vec3(0.03) * (gridX + gridY * 0.3);

    // Calculate bar index
    float barIndex = floor(uv.x * NUM_BARS);
    float barX = fract(uv.x * NUM_BARS);

    // Simulate frequency distribution across bars
    // Lower bars = bass, middle = mid, higher = treble
    float freqPos = barIndex / NUM_BARS;

    // Create frequency response curve
    float barHeight;
    if (freqPos < 0.33) {
        // Bass region
        float localPos = freqPos / 0.33;
        barHeight = u_bass * (0.6 + 0.4 * sin(localPos * PI));
        barHeight += sin(t * 4.0 + barIndex * 0.5) * 0.05 * u_bass;
    } else if (freqPos < 0.66) {
        // Mid region
        float localPos = (freqPos - 0.33) / 0.33;
        barHeight = u_mid * (0.5 + 0.5 * sin(localPos * PI + 0.5));
        barHeight += sin(t * 6.0 + barIndex * 0.3) * 0.04 * u_mid;
    } else {
        // Treble region
        float localPos = (freqPos - 0.66) / 0.34;
        barHeight = u_treble * (0.4 + 0.6 * (1.0 - localPos));
        barHeight += sin(t * 8.0 + barIndex * 0.2) * 0.03 * u_treble;
    }

    // Add some variation between bars
    barHeight *= 0.7 + 0.3 * hash(barIndex + floor(t * 10.0) * 0.01);
    barHeight = clamp(barHeight, 0.02, 0.95);

    // Smoothed bar height with attack/decay feel
    float smoothHeight = barHeight * (0.8 + 0.2 * sin(t * 3.0 + barIndex));

    // Bar shape - centered with gap
    float barWidth = 0.7;
    float barMask = step(abs(barX - 0.5), barWidth * 0.5);

    // Height mask
    float heightMask = step(uv.y, smoothHeight * 0.8 + 0.1);

    // Segment the bars (like LED equalizer)
    float segmentCount = 20.0;
    float segment = floor(uv.y * segmentCount) / segmentCount;
    float segmentMask = step(fract(uv.y * segmentCount), 0.85);

    // Color gradient based on height (green -> yellow -> red)
    vec3 barColor;
    float normalizedY = uv.y / (smoothHeight * 0.8 + 0.1);
    if (normalizedY < 0.5) {
        barColor = mix(vec3(0.0, 0.8, 0.2), vec3(0.2, 1.0, 0.0), normalizedY * 2.0);
    } else if (normalizedY < 0.8) {
        barColor = mix(vec3(0.2, 1.0, 0.0), vec3(1.0, 1.0, 0.0), (normalizedY - 0.5) / 0.3);
    } else {
        barColor = mix(vec3(1.0, 1.0, 0.0), vec3(1.0, 0.2, 0.0), (normalizedY - 0.8) / 0.2);
    }

    // Add glow effect
    float glow = exp(-abs(barX - 0.5) * 4.0) * smoothHeight;
    vec3 glowColor = barColor * 0.3;

    // Peak indicator (falling dot at top)
    float peakHeight = smoothHeight * 0.8 + 0.12;
    float peakDot = smoothstep(0.015, 0.0, abs(uv.y - peakHeight)) * barMask;

    // Combine
    float bar = barMask * heightMask * segmentMask;
    color += barColor * bar * 0.9;
    color += glowColor * glow * 0.5;
    color += vec3(1.0, 0.9, 0.8) * peakDot * 0.8;

    // Reflection below
    if (uv.y < 0.1) {
        float reflectY = 0.1 - uv.y;
        float reflectHeight = smoothHeight * 0.8 + 0.1;
        float reflectMask = step(reflectY, reflectHeight * 0.3);
        float reflectSegment = step(fract(reflectY * segmentCount), 0.85);
        float reflectBar = barMask * reflectMask * reflectSegment;
        color += barColor * reflectBar * 0.15 * (1.0 - reflectY * 5.0);
    }

    // Ambient light from bars
    float ambientGlow = (u_bass + u_mid + u_treble) / 3.0;
    color += vec3(0.1, 0.05, 0.15) * ambientGlow * 0.3;

    // Beat flash - bars flash bright white on beat
    color += vec3(0.8, 0.9, 1.0) * bar * u_beat * 0.6;
    color += vec3(0.3, 0.4, 0.5) * u_beat * 0.3;

    // Scanline effect (subtle CRT feel)
    float scanline = sin(uv.y * u_resolution.y * 0.5) * 0.02 + 1.0;
    color *= scanline;

    // Vignette
    float vignette = 1.0 - length(uv - 0.5) * 0.5;
    color *= vignette;

    // Blend with video
    vec3 video = texture2D(u_video, screenUV).rgb;
    float videoPresence = step(0.01, dot(video, vec3(1.0)));
    color = mix(color, 1.0 - (1.0 - color) * (1.0 - video), videoPresence * 0.7);

    gl_FragColor = vec4(color, 1.0);
}
