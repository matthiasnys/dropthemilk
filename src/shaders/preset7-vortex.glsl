// Preset 7: Hypnotic Vortex
uniform float u_time;
uniform float u_bass;
uniform float u_mid;
uniform float u_treble;
uniform float u_beat;
uniform vec2 u_resolution;
uniform sampler2D u_video;

#define PI 3.14159265359

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
    vec2 screenUV = gl_FragCoord.xy / u_resolution.xy;
    float t = u_time;

    // Camera panning - spiral motion
    vec2 pan;
    pan.x = sin(t * 0.12) * 0.6 + cos(t * 0.18) * 0.4;
    pan.y = cos(t * 0.1) * 0.5 + sin(t * 0.15) * 0.3;
    pan += vec2(sin(t * 5.0), cos(t * 4.5)) * u_bass * 0.08;

    vec2 puv = uv + pan;
    float dist = length(puv);
    float angle = atan(puv.y, puv.x);

    // Spiral arms
    float spiral = sin(angle * 5.0 + dist * 15.0 - t * 3.0 - u_bass * 8.0);
    float spiral2 = sin(angle * 3.0 - dist * 10.0 + t * 2.0 + u_mid * 5.0);

    // Vortex twist increases toward center
    float twist = 1.0 / (dist + 0.3);
    float vortex = sin(angle * 8.0 + twist * 5.0 - t * 4.0) * 0.5 + 0.5;

    // Color layers
    vec3 color = vec3(0.0);

    // Deep purple base
    color += vec3(0.1, 0.0, 0.2) * (1.0 - dist * 0.3);

    // Spiral arms - hot pink/magenta
    color += vec3(1.0, 0.0, 0.6) * (spiral * 0.5 + 0.5) * (0.4 + u_bass * 0.6) * smoothstep(1.5, 0.0, dist);

    // Secondary spiral - cyan
    color += vec3(0.0, 0.8, 1.0) * (spiral2 * 0.5 + 0.5) * (0.3 + u_mid * 0.5) * smoothstep(1.2, 0.0, dist);

    // Vortex core - white hot
    color += vec3(1.0, 0.9, 1.0) * vortex * exp(-dist * 3.0) * (0.5 + u_treble * 0.5);

    // Pulsing rings
    float rings = sin(dist * 30.0 - t * 5.0 - u_bass * 10.0) * 0.5 + 0.5;
    rings *= smoothstep(1.0, 0.2, dist);
    color += vec3(0.5, 0.2, 1.0) * rings * 0.3;

    // Bright center
    float core = exp(-dist * 5.0) * (1.0 + u_bass * 2.0);
    color += vec3(1.0, 0.8, 1.0) * core;

    // Event horizon glow
    float horizon = smoothstep(0.3, 0.1, dist) * smoothstep(0.0, 0.1, dist);
    color += vec3(1.0, 0.5, 0.0) * horizon * (0.5 + u_bass);

    // Beat flash - intense vortex pulse
    color += vec3(1.0, 0.6, 1.0) * u_beat * exp(-dist * 2.0);
    color += vec3(0.8, 0.9, 1.0) * u_beat * 0.3;

    color *= 1.0 - length(uv) * 0.25;

    // Blend with video
    vec3 video = texture2D(u_video, screenUV).rgb;
    float videoPresence = step(0.01, dot(video, vec3(1.0)));
    color = mix(color, 1.0 - (1.0 - color) * (1.0 - video), videoPresence * 0.7);

    gl_FragColor = vec4(color, 1.0);
}
