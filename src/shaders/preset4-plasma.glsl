// Preset 4: Retro Plasma with panning
uniform float u_time;
uniform float u_bass;
uniform float u_mid;
uniform float u_treble;
uniform float u_beat;
uniform vec2 u_resolution;
uniform sampler2D u_video;

#define PI 3.14159265359

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    vec2 screenUV = uv;
    float t = u_time * 0.5;

    // Camera panning
    vec2 pan;
    pan.x = sin(t * 0.3) * 0.3 + sin(t * 0.5) * 0.15;
    pan.y = cos(t * 0.25) * 0.25 + cos(t * 0.4) * 0.1;
    pan += vec2(sin(t * 8.0), cos(t * 7.0)) * u_bass * 0.03;

    // Scale and center
    vec2 p = (uv - 0.5) * 2.0 + pan;
    p.x *= u_resolution.x / u_resolution.y;

    // Classic plasma waves
    float v1 = sin(p.x * 5.0 + t + u_bass * 3.0);
    float v2 = sin(5.0 * (p.x * sin(t * 0.5) + p.y * cos(t * 0.3)) + t);
    float v3 = sin(sqrt(p.x * p.x + p.y * p.y) * 8.0 - t * 2.0 - u_mid * 5.0);

    float cx = p.x + 0.5 * sin(t * 0.3);
    float cy = p.y + 0.5 * cos(t * 0.4);
    float v4 = sin(sqrt(cx * cx + cy * cy) * 10.0 + t + u_treble * 4.0);

    float v = v1 + v2 + v3 + v4;
    v *= 0.25;

    // Color mapping
    vec3 color;
    color.r = sin(v * PI + t) * 0.5 + 0.5;
    color.g = sin(v * PI + t + PI * 0.666 + u_mid) * 0.5 + 0.5;
    color.b = sin(v * PI + t + PI * 1.333 + u_treble) * 0.5 + 0.5;

    // Boost with bass
    color = pow(color, vec3(0.8 - u_bass * 0.3));

    // CRT effect
    float scanline = sin(gl_FragCoord.y * 1.5) * 0.04 + 0.96;
    color *= scanline;

    // Slight vignette
    float dist = length(uv - 0.5);
    color *= 1.0 - dist * 0.5;

    // Beat flash - retro strobe
    color += vec3(1.0, 0.95, 0.9) * u_beat * 0.5;
    color = mix(color, vec3(1.0) - color, u_beat * 0.2);  // Color inversion pulse

    // Blend with video
    vec3 video = texture2D(u_video, screenUV).rgb;
    float videoPresence = step(0.01, dot(video, vec3(1.0)));
    color = mix(color, 1.0 - (1.0 - color) * (1.0 - video), videoPresence * 0.7);

    gl_FragColor = vec4(color, 1.0);
}
