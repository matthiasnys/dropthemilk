// Preset 1: Classic Milkdrop with panning
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

    // Camera panning
    vec2 pan;
    pan.x = sin(t * 0.13) * 0.6 + sin(t * 0.21) * 0.3;
    pan.y = cos(t * 0.11) * 0.4 + cos(t * 0.17) * 0.2;
    pan += vec2(sin(t * 5.0), cos(t * 4.5)) * u_bass * 0.05;

    vec2 puv = uv + pan;
    float t2 = t * 0.5 + u_bass * 0.5;

    float n1 = snoise(puv * 2.0 + t2 * 0.3);
    float n2 = snoise(puv * 4.0 - t2 * 0.2 + n1 * 0.5);
    float n3 = snoise(puv * 8.0 + t2 * 0.1 + n2 * 0.3);
    float noise = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;
    noise *= (0.5 + u_bass * 1.5);

    float dist = length(puv);
    float ring = sin(dist * 10.0 - t2 * 2.0 - u_bass * 5.0) * 0.5 + 0.5;
    ring *= smoothstep(2.0, 0.0, dist);

    vec3 col1 = vec3(0.1, 0.0, 0.2);
    vec3 col2 = vec3(0.0, 0.5, 0.8);
    vec3 col3 = vec3(1.0, 0.2, 0.5);
    vec3 col4 = vec3(0.0, 1.0, 0.6);

    vec3 color = mix(col1, col2, noise * 0.5 + 0.5);
    color = mix(color, col3, ring * u_mid);
    color = mix(color, col4, u_treble * 0.5 * (1.0 - dist * 0.5));

    float glow = exp(-dist * (2.5 - u_bass * 1.5));
    color += vec3(1.0, 0.8, 0.9) * glow * (0.3 + u_bass * 0.7);
    color *= 1.0 - length(uv) * 0.3;

    // Beat flash - bright pulse on beat
    color += vec3(1.0, 0.95, 0.9) * u_beat * 0.5;

    // Blend with video (screen blend mode)
    vec3 video = texture2D(u_video, screenUV).rgb;
    float videoPresence = step(0.01, dot(video, vec3(1.0)));
    color = mix(color, 1.0 - (1.0 - color) * (1.0 - video), videoPresence * 0.7);

    gl_FragColor = vec4(color, 1.0);
}
