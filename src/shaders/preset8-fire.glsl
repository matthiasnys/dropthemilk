// Preset 8: Inferno Flames
uniform float u_time;
uniform float u_bass;
uniform float u_mid;
uniform float u_treble;
uniform float u_beat;
uniform vec2 u_resolution;
uniform sampler2D u_video;

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

    // Camera panning - rising motion
    vec2 pan;
    pan.x = sin(t * 0.15) * 0.5 + sin(t * 0.23) * 0.25;
    pan.y = -t * 0.1 + sin(t * 0.2) * 0.3;  // Constant upward drift
    pan += vec2(sin(t * 6.0), cos(t * 5.0)) * u_bass * 0.06;

    vec2 puv = uv + pan;

    // Fire turbulence - multiple octaves rising
    float fire = 0.0;
    float amp = 1.0;
    float freq = 2.0;
    vec2 fireUV = puv;

    for (int i = 0; i < 5; i++) {
        fireUV.y -= t * (0.5 + float(i) * 0.2) * (1.0 + u_bass * 0.5);
        fire += snoise(fireUV * freq) * amp;
        amp *= 0.5;
        freq *= 2.0;
        fireUV = mat2(0.8, -0.6, 0.6, 0.8) * fireUV;
    }

    fire = fire * 0.5 + 0.5;

    // Height-based intensity (hotter at bottom)
    float height = 1.0 - (puv.y + 1.0) * 0.5;
    height = clamp(height, 0.0, 1.0);

    // Fire shape
    float shape = fire * height;
    shape = pow(shape, 1.5 - u_bass * 0.5);

    // Fire color gradient
    vec3 color = vec3(0.0);

    // Core (white-yellow)
    color += vec3(1.0, 0.95, 0.8) * smoothstep(0.7, 1.0, shape);

    // Inner flame (yellow-orange)
    color += vec3(1.0, 0.6, 0.0) * smoothstep(0.4, 0.8, shape);

    // Outer flame (orange-red)
    color += vec3(1.0, 0.2, 0.0) * smoothstep(0.2, 0.5, shape);

    // Tips (dark red)
    color += vec3(0.5, 0.0, 0.0) * smoothstep(0.0, 0.3, shape);

    // Embers / sparks
    for (float i = 0.0; i < 15.0; i++) {
        float seed = i * 123.456;
        vec2 sparkPos = vec2(
            sin(seed) * 0.8,
            mod(seed * 0.1 - t * (0.5 + fract(seed) * 0.5), 2.0) - 1.0
        );
        sparkPos -= pan * 0.5;
        float sparkDist = length(uv - sparkPos);
        float spark = exp(-sparkDist * 50.0) * (0.5 + u_treble);
        spark *= sin(t * 10.0 + seed) * 0.5 + 0.5;
        color += vec3(1.0, 0.6, 0.2) * spark;
    }

    // Bass pulse - intensify
    color *= 1.0 + u_bass * 0.5;

    // Ambient glow
    color += vec3(0.2, 0.05, 0.0) * (1.0 - length(uv) * 0.5);

    color *= 1.0 - length(uv) * 0.2;

    // Beat flash - fire explosion burst
    color += vec3(1.0, 0.7, 0.3) * u_beat * 0.6;
    color *= 1.0 + u_beat * 0.8;  // Intensity surge on beat

    // Blend with video
    vec3 video = texture2D(u_video, screenUV).rgb;
    float videoPresence = step(0.01, dot(video, vec3(1.0)));
    color = mix(color, 1.0 - (1.0 - color) * (1.0 - video), videoPresence * 0.7);

    gl_FragColor = vec4(color, 1.0);
}
