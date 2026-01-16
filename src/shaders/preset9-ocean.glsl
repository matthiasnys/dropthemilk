// Preset 9: Deep Ocean
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

    // Camera panning - underwater drift
    vec2 pan;
    pan.x = sin(t * 0.08) * 0.7 + sin(t * 0.13) * 0.4;
    pan.y = cos(t * 0.06) * 0.5 + sin(t * 0.1) * 0.3;
    pan += vec2(sin(t * 2.0), cos(t * 1.8)) * u_bass * 0.05;

    vec2 puv = uv + pan;

    // Water caustics
    float caustic1 = snoise(puv * 3.0 + t * 0.3);
    float caustic2 = snoise(puv * 5.0 - t * 0.2);
    float caustic3 = snoise(puv * 8.0 + t * 0.4);
    float caustics = (caustic1 + caustic2 * 0.5 + caustic3 * 0.25) * 0.5 + 0.5;
    caustics = pow(caustics, 2.0 - u_mid);

    // Wave patterns
    float wave1 = sin(puv.x * 8.0 + puv.y * 4.0 + t * 2.0 + u_bass * 5.0) * 0.5 + 0.5;
    float wave2 = sin(puv.x * 5.0 - puv.y * 7.0 - t * 1.5) * 0.5 + 0.5;
    float waves = wave1 * wave2;

    // Deep ocean gradient
    vec3 deepBlue = vec3(0.0, 0.02, 0.1);
    vec3 midBlue = vec3(0.0, 0.1, 0.3);
    vec3 lightBlue = vec3(0.0, 0.3, 0.5);
    vec3 surfaceBlue = vec3(0.1, 0.5, 0.7);

    float depth = puv.y * 0.5 + 0.5;
    vec3 color = mix(deepBlue, midBlue, depth);
    color = mix(color, lightBlue, depth * depth);

    // Add caustics
    color += vec3(0.1, 0.4, 0.6) * caustics * (0.3 + u_treble * 0.4);

    // Add waves
    color += vec3(0.0, 0.2, 0.3) * waves * 0.3;

    // Light rays from surface
    for (float i = 0.0; i < 5.0; i++) {
        float rayX = sin(i * 1.5 + t * 0.1) * 0.8;
        float rayWidth = 0.1 + sin(t * 0.5 + i) * 0.05;
        float ray = smoothstep(rayWidth, 0.0, abs(puv.x - rayX));
        ray *= smoothstep(-0.5, 0.5, puv.y);  // Fade with depth
        ray *= 0.3 + u_mid * 0.3;
        color += vec3(0.2, 0.5, 0.6) * ray;
    }

    // Bubbles
    for (float i = 0.0; i < 12.0; i++) {
        float seed = i * 234.567;
        vec2 bubblePos = vec2(
            sin(seed) * 1.2,
            mod(seed * 0.1 + t * (0.2 + fract(seed) * 0.3), 2.5) - 1.25
        );
        bubblePos -= pan * 0.3;
        float bubbleSize = 0.02 + fract(seed * 0.5) * 0.03;
        float bubble = smoothstep(bubbleSize, bubbleSize * 0.5, length(uv - bubblePos));
        bubble *= 0.5 + u_treble * 0.5;
        color += vec3(0.3, 0.6, 0.8) * bubble * 0.4;
    }

    // Bass pulse - pressure wave
    float pulse = sin(length(puv) * 10.0 - t * 3.0 - u_bass * 8.0) * 0.5 + 0.5;
    pulse *= exp(-length(puv) * 2.0) * u_bass;
    color += vec3(0.0, 0.3, 0.5) * pulse;

    color *= 1.0 - length(uv) * 0.25;

    // Beat flash - underwater shockwave
    float shockwave = exp(-abs(length(puv) - u_beat * 2.0) * 8.0) * u_beat;
    color += vec3(0.3, 0.6, 0.8) * shockwave * 0.8;
    color += vec3(0.4, 0.7, 0.9) * u_beat * 0.25;

    // Blend with video
    vec3 video = texture2D(u_video, screenUV).rgb;
    float videoPresence = step(0.01, dot(video, vec3(1.0)));
    color = mix(color, 1.0 - (1.0 - color) * (1.0 - video), videoPresence * 0.7);

    gl_FragColor = vec4(color, 1.0);
}
