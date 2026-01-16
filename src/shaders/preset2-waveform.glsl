// Preset 2: Neon Waveform Tunnel with panning
uniform float u_time;
uniform float u_bass;
uniform float u_mid;
uniform float u_treble;
uniform float u_beat;
uniform vec2 u_resolution;
uniform sampler2D u_video;

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
    vec2 screenUV = gl_FragCoord.xy / u_resolution.xy;
    float t = u_time;

    // Camera panning - circular motion
    vec2 pan;
    pan.x = sin(t * 0.17) * 0.5 + cos(t * 0.13) * 0.3;
    pan.y = cos(t * 0.14) * 0.4 + sin(t * 0.19) * 0.25;
    pan += vec2(cos(t * 6.0), sin(t * 5.5)) * u_bass * 0.06;

    vec2 puv = uv + pan;

    // Tunnel effect
    float angle = atan(puv.y, puv.x);
    float dist = length(puv);

    // Warp the tunnel based on bass
    float tunnel = 1.0 / (dist + 0.1) + t * 0.5 + u_bass * 2.0;

    // Create wave rings
    float wave1 = sin(tunnel * 3.0 + angle * 3.0) * 0.5 + 0.5;
    float wave2 = sin(tunnel * 5.0 - angle * 2.0 + u_mid * 5.0) * 0.5 + 0.5;
    float wave3 = sin(tunnel * 8.0 + angle * 4.0 - u_treble * 3.0) * 0.5 + 0.5;

    // Neon colors
    vec3 color = vec3(0.0);
    color += vec3(1.0, 0.0, 0.5) * wave1 * (0.5 + u_bass);
    color += vec3(0.0, 1.0, 0.8) * wave2 * (0.5 + u_mid);
    color += vec3(0.5, 0.0, 1.0) * wave3 * (0.5 + u_treble);

    // Glow at center
    float centerGlow = exp(-dist * 2.0) * (1.0 + u_bass * 2.0);
    color += vec3(1.0, 0.8, 1.0) * centerGlow;

    // Scanlines
    float scanline = sin(gl_FragCoord.y * 2.0) * 0.1 + 0.9;
    color *= scanline;

    // Vignette
    color *= 1.0 - length(uv) * 0.3;

    // Beat flash - tunnel pulse
    color += vec3(0.8, 0.6, 1.0) * u_beat * exp(-dist * 1.5);
    color += vec3(1.0, 0.9, 1.0) * u_beat * 0.3;

    // Blend with video
    vec3 video = texture2D(u_video, screenUV).rgb;
    float videoPresence = step(0.01, dot(video, vec3(1.0)));
    color = mix(color, 1.0 - (1.0 - color) * (1.0 - video), videoPresence * 0.7);

    gl_FragColor = vec4(color, 1.0);
}
