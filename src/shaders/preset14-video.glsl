// Preset 14: Video Reactive
uniform float u_time;
uniform float u_bass;
uniform float u_mid;
uniform float u_treble;
uniform float u_beat;
uniform vec2 u_resolution;
uniform sampler2D u_video;

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;

    // Audio-reactive distortion
    vec2 center = uv - 0.5;
    float dist = length(center);

    // Barrel distortion on bass
    float barrel = 1.0 + u_bass * 0.3 * dist * dist;
    vec2 distortedUV = 0.5 + center * barrel;

    // Chromatic aberration on bass hits
    float chromaOffset = u_bass * 0.015;
    vec3 color;
    color.r = texture2D(u_video, distortedUV + vec2(chromaOffset, 0.0)).r;
    color.g = texture2D(u_video, distortedUV).g;
    color.b = texture2D(u_video, distortedUV - vec2(chromaOffset, 0.0)).b;

    // Boost saturation on mid frequencies
    float gray = dot(color, vec3(0.299, 0.587, 0.114));
    color = mix(vec3(gray), color, 1.0 + u_mid * 0.5);

    // Edge glow effect
    float edge = smoothstep(0.0, 0.3, dist) * smoothstep(0.8, 0.5, dist);
    vec3 glowColor = vec3(u_bass, u_mid, u_treble);
    color += glowColor * (1.0 - edge) * 0.3;

    // Vignette
    float vignette = 1.0 - dist * 0.5;
    color *= vignette;

    // Brightness pulse on treble
    color *= 1.0 + u_treble * 0.2;

    // Beat flash - video strobe
    color += vec3(1.0, 0.95, 0.9) * u_beat * 0.4;
    color *= 1.0 + u_beat * 0.6;

    gl_FragColor = vec4(color, 1.0);
}
