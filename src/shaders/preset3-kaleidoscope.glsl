// Preset 3: Kaleidoscope with panning
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
    float t = u_time * 0.3;

    // Camera panning
    vec2 pan;
    pan.x = sin(t * 0.5) * 0.7 + sin(t * 0.8) * 0.3;
    pan.y = cos(t * 0.4) * 0.5 + cos(t * 0.7) * 0.25;
    pan += vec2(sin(t * 15.0), cos(t * 14.0)) * u_bass * 0.04;

    vec2 puv = uv + pan;

    // Convert to polar
    float angle = atan(puv.y, puv.x);
    float dist = length(puv);

    // Kaleidoscope fold - segments based on mid
    float segments = 6.0 + floor(u_mid * 6.0);
    angle = mod(angle, PI * 2.0 / segments);
    angle = abs(angle - PI / segments);

    // Back to cartesian
    vec2 kuv = vec2(cos(angle), sin(angle)) * dist;

    // Rotate over time
    float rot = t + u_bass * 0.5;
    kuv = mat2(cos(rot), -sin(rot), sin(rot), cos(rot)) * kuv;

    // Layered patterns
    float n1 = snoise(kuv * 3.0 + t);
    float n2 = snoise(kuv * 6.0 - t * 0.5);
    float pattern = n1 * 0.6 + n2 * 0.4;

    // Geometric shapes
    float shape = sin(dist * 20.0 - t * 10.0 - u_bass * 8.0) * 0.5 + 0.5;
    shape *= smoothstep(1.5, 0.0, dist);

    // Rainbow palette
    vec3 color;
    float hue = pattern * 0.5 + t * 0.3 + u_treble;
    color.r = sin(hue * PI * 2.0) * 0.5 + 0.5;
    color.g = sin(hue * PI * 2.0 + PI * 0.666) * 0.5 + 0.5;
    color.b = sin(hue * PI * 2.0 + PI * 1.333) * 0.5 + 0.5;

    color *= 0.5 + shape * (0.5 + u_bass);
    color += vec3(1.0) * exp(-dist * 4.0) * u_bass;
    color *= 1.0 - length(uv) * 0.3;

    // Beat flash - kaleidoscope burst
    color += vec3(1.0, 0.9, 0.95) * u_beat * 0.4;
    color *= 1.0 + u_beat * 0.5;  // Saturation boost on beat

    // Blend with video
    vec3 video = texture2D(u_video, screenUV).rgb;
    float videoPresence = step(0.01, dot(video, vec3(1.0)));
    color = mix(color, 1.0 - (1.0 - color) * (1.0 - video), videoPresence * 0.7);

    gl_FragColor = vec4(color, 1.0);
}
