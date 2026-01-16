// Preset 11: Aurora Borealis
uniform float u_time;
uniform float u_bass;
uniform float u_mid;
uniform float u_treble;
uniform float u_beat;
uniform vec2 u_resolution;
uniform sampler2D u_video;

#define PI 3.14159265359

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m; m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
    vec2 screenUV = gl_FragCoord.xy / u_resolution.xy;
    float t = u_time;

    // Camera panning - slow majestic sweep
    vec2 pan;
    pan.x = sin(t * 0.05) * 0.8 + sin(t * 0.08) * 0.4;
    pan.y = cos(t * 0.04) * 0.3 + sin(t * 0.06) * 0.2;
    pan += vec2(sin(t * 2.0), cos(t * 1.8)) * u_bass * 0.03;

    vec2 puv = uv + pan;

    // Night sky gradient
    vec3 skyDark = vec3(0.0, 0.0, 0.02);
    vec3 skyHorizon = vec3(0.02, 0.02, 0.08);
    float skyGrad = smoothstep(-0.5, 0.8, puv.y);
    vec3 color = mix(skyHorizon, skyDark, skyGrad);

    // Stars
    for (float i = 0.0; i < 50.0; i++) {
        float seed = i * 127.1;
        vec2 starPos = vec2(
            fract(sin(seed) * 43758.5453) * 3.0 - 1.5,
            fract(cos(seed * 1.3) * 43758.5453) * 2.0 - 0.5
        );
        starPos -= pan * 0.1;  // Slow parallax
        float starDist = length(uv - starPos);
        float star = exp(-starDist * 200.0) * (0.3 + 0.7 * sin(t * 2.0 + seed));
        color += vec3(1.0) * star * 0.5;
    }

    // Aurora layers
    for (float i = 0.0; i < 4.0; i++) {
        float layer = i / 4.0;

        // Curtain wave motion
        float wave = snoise(vec2(puv.x * 2.0 + t * 0.2 + i, t * 0.1 + i * 0.5));
        wave += snoise(vec2(puv.x * 4.0 - t * 0.15, t * 0.15)) * 0.5;

        // Vertical curtain shape
        float curtainY = 0.3 + layer * 0.15 + wave * 0.2 * (1.0 + u_mid);
        float curtain = smoothstep(curtainY + 0.3, curtainY, puv.y);
        curtain *= smoothstep(curtainY - 0.4, curtainY - 0.1, puv.y);

        // Horizontal variation
        float hVar = snoise(vec2(puv.x * 3.0 + t * 0.3 + i * 10.0, i));
        curtain *= 0.5 + hVar * 0.5;

        // Color gradient (green -> blue -> purple)
        vec3 auroraColor;
        float colorPhase = puv.y * 2.0 + layer + t * 0.1 + u_treble;
        auroraColor.r = sin(colorPhase * PI + PI * 1.2) * 0.3 + 0.2;
        auroraColor.g = sin(colorPhase * PI) * 0.5 + 0.5;
        auroraColor.b = sin(colorPhase * PI + PI * 0.5) * 0.4 + 0.4;

        // Intensity variation
        float intensity = 0.3 + u_bass * 0.4 + sin(t * 0.5 + i) * 0.2;

        color += auroraColor * curtain * intensity * (1.0 - layer * 0.2);
    }

    // Audio waveforms - flowing like aurora ribbons
    for (float w = 0.0; w < 3.0; w++) {
        float waveY = -0.2 + w * 0.25;  // Base position for each wave
        float waveSpeed = 1.0 + w * 0.5;

        // Create flowing wave shape from audio
        float wave = 0.0;
        // Bass component - slow, large waves
        wave += sin(puv.x * 3.0 + t * waveSpeed) * u_bass * 0.15;
        wave += sin(puv.x * 5.0 - t * waveSpeed * 0.7) * u_bass * 0.1;
        // Mid component - medium frequency
        wave += sin(puv.x * 8.0 + t * waveSpeed * 1.5 + w) * u_mid * 0.08;
        wave += sin(puv.x * 12.0 - t * waveSpeed * 1.2) * u_mid * 0.05;
        // Treble component - fast, small waves
        wave += sin(puv.x * 20.0 + t * waveSpeed * 2.0 + w * 2.0) * u_treble * 0.04;
        wave += sin(puv.x * 30.0 - t * waveSpeed * 2.5) * u_treble * 0.025;

        // Add noise for organic feel
        wave += snoise(vec2(puv.x * 4.0 + t * 0.5, w)) * 0.03 * (u_bass + u_mid);

        // Distance from wave line
        float dist = abs(puv.y - (waveY + wave));

        // Glowing line effect
        float lineGlow = exp(-dist * 40.0) * 0.8;
        float lineCore = exp(-dist * 120.0) * 1.0;

        // Aurora-style colors for each wave
        vec3 waveColor;
        if (w < 1.0) {
            // Green wave (bass)
            waveColor = vec3(0.2, 1.0, 0.4);
        } else if (w < 2.0) {
            // Cyan wave (mid)
            waveColor = vec3(0.2, 0.8, 1.0);
        } else {
            // Purple wave (treble)
            waveColor = vec3(0.6, 0.3, 1.0);
        }

        // Intensity based on audio
        float audioIntensity = (w < 1.0) ? u_bass : ((w < 2.0) ? u_mid : u_treble);
        audioIntensity = 0.3 + audioIntensity * 0.7;

        // Add to color with glow
        color += waveColor * lineGlow * audioIntensity * 0.6;
        color += vec3(1.0) * lineCore * audioIntensity * 0.4;
    }

    // Shimmer effect
    float shimmer = snoise(puv * 20.0 + t * 2.0) * 0.5 + 0.5;
    shimmer *= snoise(puv * 30.0 - t * 1.5) * 0.5 + 0.5;
    color += vec3(0.1, 0.3, 0.2) * shimmer * 0.1 * (0.5 + u_treble);

    // Glow
    float glow = exp(-length(puv - vec2(0.0, 0.3)) * 1.5) * 0.3;
    color += vec3(0.1, 0.4, 0.3) * glow * (0.5 + u_mid * 0.5);

    color *= 1.0 - length(uv) * 0.15;

    // Beat flash - aurora flare
    color += vec3(0.4, 0.9, 0.6) * u_beat * 0.5;
    color *= 1.0 + u_beat * 0.6;  // Intensity boost on beat

    // Blend with video
    vec3 video = texture2D(u_video, screenUV).rgb;
    float videoPresence = step(0.01, dot(video, vec3(1.0)));
    color = mix(color, 1.0 - (1.0 - color) * (1.0 - video), videoPresence * 0.7);

    gl_FragColor = vec4(color, 1.0);
}
