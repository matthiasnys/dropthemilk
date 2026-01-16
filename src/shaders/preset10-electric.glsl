// Preset 10: Electric Storm
uniform float u_time;
uniform float u_bass;
uniform float u_mid;
uniform float u_treble;
uniform float u_beat;
uniform vec2 u_resolution;
uniform sampler2D u_video;

#define PI 3.14159265359

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float lightning(vec2 uv, vec2 start, vec2 end, float t, float seed) {
    vec2 dir = end - start;
    float len = length(dir);
    dir /= len;
    vec2 perp = vec2(-dir.y, dir.x);

    vec2 p = uv - start;
    float along = dot(p, dir);
    float across = dot(p, perp);

    if (along < 0.0 || along > len) return 0.0;

    // Jagged displacement
    float displacement = 0.0;
    float freq = 20.0;
    float amp = 0.15;
    for (int i = 0; i < 4; i++) {
        displacement += sin(along * freq + t * 10.0 + seed * 100.0) * amp;
        freq *= 2.0;
        amp *= 0.5;
    }

    float dist = abs(across - displacement);
    float width = 0.02 * (1.0 - along / len * 0.5);  // Taper

    return smoothstep(width, 0.0, dist);
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
    vec2 screenUV = gl_FragCoord.xy / u_resolution.xy;
    float t = u_time;

    // Camera panning - erratic motion
    vec2 pan;
    pan.x = sin(t * 0.2) * 0.5 + sin(t * 0.35) * 0.3;
    pan.y = cos(t * 0.15) * 0.4 + cos(t * 0.28) * 0.25;
    // Shake on bass
    pan += vec2(sin(t * 20.0), cos(t * 18.0)) * u_bass * 0.1;

    vec2 puv = uv + pan;

    // Storm clouds background
    float clouds = 0.0;
    vec2 cloudUV = puv * 2.0;
    for (int i = 0; i < 4; i++) {
        clouds += noise(cloudUV + t * 0.1) * (1.0 / float(i + 1));
        cloudUV *= 2.0;
    }
    clouds = clouds * 0.5 + 0.5;

    // Dark stormy base
    vec3 color = mix(vec3(0.02, 0.02, 0.05), vec3(0.1, 0.1, 0.15), clouds);

    // Lightning bolts
    float totalLightning = 0.0;

    for (float i = 0.0; i < 6.0; i++) {
        float seed = i * 456.789;
        float flash = step(0.97, hash(vec2(floor(t * 3.0 + seed), i)));
        flash *= step(0.5, u_bass + u_treble);  // Only on audio peaks

        if (flash > 0.0 || mod(i, 2.0) == 0.0) {
            vec2 start = vec2(sin(seed) * 0.8, 0.8);
            vec2 end = vec2(sin(seed * 1.3) * 0.6, -0.6);
            start -= pan;
            end -= pan;

            float bolt = lightning(uv, start, end, t, seed);
            totalLightning += bolt * (0.3 + flash * 0.7);

            // Branch
            vec2 branchStart = mix(start, end, 0.4);
            vec2 branchEnd = branchStart + vec2(sin(seed * 2.0) * 0.4, -0.3);
            totalLightning += lightning(uv, branchStart, branchEnd, t, seed + 1.0) * 0.5;
        }
    }

    // Lightning color (white-blue core, purple edges)
    color += vec3(0.7, 0.8, 1.0) * totalLightning;
    color += vec3(0.5, 0.3, 1.0) * totalLightning * 0.5;

    // Electric field lines
    float field = sin(puv.x * 30.0 + sin(puv.y * 10.0 + t * 2.0) * 3.0);
    field *= sin(puv.y * 25.0 + cos(puv.x * 8.0 - t * 1.5) * 2.0);
    field = smoothstep(0.8, 1.0, abs(field));
    color += vec3(0.3, 0.4, 1.0) * field * (0.1 + u_mid * 0.2);

    // Flash illumination on bass
    float flashIntensity = u_bass * u_bass * 2.0;
    color += vec3(0.2, 0.2, 0.4) * flashIntensity;

    // Beat flash - lightning strike illumination
    color += vec3(0.6, 0.7, 1.0) * u_beat * 0.8;
    color += totalLightning * u_beat * 2.0;  // Extra bright lightning on beat

    // Ambient glow
    float glow = exp(-length(puv) * 1.5);
    color += vec3(0.1, 0.1, 0.3) * glow;

    color *= 1.0 - length(uv) * 0.2;

    // Blend with video
    vec3 video = texture2D(u_video, screenUV).rgb;
    float videoPresence = step(0.01, dot(video, vec3(1.0)));
    color = mix(color, 1.0 - (1.0 - color) * (1.0 - video), videoPresence * 0.7);

    gl_FragColor = vec4(color, 1.0);
}
