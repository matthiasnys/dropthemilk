// Preset 5: Star Field with panning
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

float star(vec2 uv, float size, float brightness) {
    float d = length(uv);
    float m = brightness / d;
    m *= smoothstep(size, size * 0.1, d);
    return m;
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
    vec2 screenUV = gl_FragCoord.xy / u_resolution.xy;
    float t = u_time;

    // Camera panning - slow drift through space
    vec2 pan;
    pan.x = t * 0.05 + sin(t * 0.1) * 0.3;
    pan.y = t * 0.03 + cos(t * 0.08) * 0.2;
    pan += vec2(sin(t * 4.0), cos(t * 3.5)) * u_bass * 0.04;

    vec3 color = vec3(0.0);

    // Multiple star layers with parallax
    for (float i = 0.0; i < 4.0; i++) {
        float speed = 0.1 + i * 0.15;
        float scale = 8.0 + i * 6.0;

        vec2 layerPan = pan * (1.0 + i * 0.5);
        vec2 gv = fract(uv * scale + layerPan) - 0.5;
        vec2 id = floor(uv * scale + layerPan);

        float h = hash(id);

        if (h > 0.6) {
            float brightness = (h - 0.6) * 2.5;
            brightness *= 0.5 + u_treble * 1.5;
            brightness *= 0.7 + 0.3 * sin(t * 5.0 + h * 100.0);

            vec3 starColor = vec3(1.0);
            if (h > 0.85) starColor = vec3(0.8, 0.9, 1.0);
            else if (h > 0.75) starColor = vec3(1.0, 0.9, 0.7);
            else starColor = vec3(0.7, 0.8, 1.0);

            color += starColor * star(gv, 0.1, brightness * 0.03);
        }
    }

    // Nebula background
    float nebula = 0.0;
    vec2 nuv = uv * 2.0 + pan * 0.3;
    for (float i = 1.0; i < 5.0; i++) {
        nuv = mat2(0.8, -0.6, 0.6, 0.8) * nuv;
        nebula += sin(nuv.x * i + t * 0.2) * sin(nuv.y * i + t * 0.3) / i;
    }
    nebula = nebula * 0.5 + 0.5;

    vec3 nebulaColor = mix(
        vec3(0.1, 0.0, 0.2),
        vec3(0.0, 0.1, 0.3),
        nebula
    );
    nebulaColor += vec3(0.3, 0.0, 0.2) * u_mid * nebula;

    color += nebulaColor * 0.5;

    // Central glow pulse with bass
    float dist = length(uv);
    float pulse = exp(-dist * (2.0 - u_bass * 1.5)) * (0.3 + u_bass * 0.7);
    color += vec3(0.5, 0.3, 1.0) * pulse;

    // Shooting stars on high treble
    if (u_treble > 0.4) {
        float streak = hash(floor(vec2(t * 2.0)));
        vec2 streakPos = vec2(streak - 0.5, streak * 0.5 - 0.25) * 2.0 - pan;
        float streakDist = length(uv - streakPos);
        color += vec3(1.0, 0.9, 0.8) * exp(-streakDist * 20.0) * (u_treble - 0.4) * 2.0;
    }

    color *= 1.0 - length(uv) * 0.2;

    // Beat flash - supernova burst
    color += vec3(0.6, 0.5, 1.0) * u_beat * exp(-dist * 3.0);
    color += vec3(1.0, 0.95, 0.9) * u_beat * 0.25;

    // Blend with video
    vec3 video = texture2D(u_video, screenUV).rgb;
    float videoPresence = step(0.01, dot(video, vec3(1.0)));
    color = mix(color, 1.0 - (1.0 - color) * (1.0 - video), videoPresence * 0.7);

    gl_FragColor = vec4(color, 1.0);
}
