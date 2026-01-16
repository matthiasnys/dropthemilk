// Preset 6: Sacred Geometry with panning
uniform float u_time;
uniform float u_bass;
uniform float u_mid;
uniform float u_treble;
uniform float u_beat;
uniform vec2 u_resolution;
uniform sampler2D u_video;

#define PI 3.14159265359

float polygon(vec2 p, int n, float size) {
    float a = atan(p.x, p.y) + PI;
    float r = 2.0 * PI / float(n);
    return cos(floor(0.5 + a / r) * r - a) * length(p) - size;
}

mat2 rot(float a) {
    float c = cos(a), s = sin(a);
    return mat2(c, -s, s, c);
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
    vec2 screenUV = gl_FragCoord.xy / u_resolution.xy;
    float t = u_time * 0.5;

    // Camera panning
    vec2 pan;
    pan.x = sin(t * 0.3) * 0.5 + sin(t * 0.5) * 0.25;
    pan.y = cos(t * 0.25) * 0.4 + cos(t * 0.4) * 0.2;
    pan += vec2(sin(t * 6.0), cos(t * 5.5)) * u_bass * 0.05;

    vec2 puv = uv + pan;

    vec3 color = vec3(0.0);
    float dist = length(puv);

    // Rotating layers
    for (float i = 0.0; i < 6.0; i++) {
        float offset = i * PI / 3.0;
        float scale = 0.3 + i * 0.1;
        float rotation = t * (0.2 + i * 0.05) * (mod(i, 2.0) == 0.0 ? 1.0 : -1.0);
        rotation += u_bass * 0.5;

        vec2 p = rot(rotation + offset) * puv;

        // Hexagons
        float hex = polygon(p, 6, scale * (1.0 + u_mid * 0.3));
        float hexLine = abs(hex) - 0.005;

        // Triangle overlay
        float tri = polygon(p * 1.5, 3, scale * 0.8);
        float triLine = abs(tri) - 0.003;

        // Color each layer
        vec3 layerColor = vec3(
            sin(i * 0.5 + t) * 0.5 + 0.5,
            sin(i * 0.5 + t + PI * 0.666) * 0.5 + 0.5,
            sin(i * 0.5 + t + PI * 1.333) * 0.5 + 0.5
        );

        float alpha = 1.0 - i * 0.15;
        color += layerColor * smoothstep(0.01, 0.0, hexLine) * alpha * (0.5 + u_bass * 0.5);
        color += layerColor * smoothstep(0.008, 0.0, triLine) * alpha * 0.5 * (0.5 + u_treble);
    }

    // Concentric circles
    float circles = sin(dist * 30.0 - t * 6.0 - u_bass * 10.0);
    circles = smoothstep(0.0, 0.1, abs(circles) - 0.9);
    color += vec3(0.3, 0.5, 1.0) * (1.0 - circles) * 0.3 * (0.5 + u_mid);

    // Center mandala
    float mandala = 0.0;
    for (float i = 0.0; i < 8.0; i++) {
        float a = i * PI / 4.0 + t * 0.2;
        vec2 mp = rot(a) * puv;
        mandala += smoothstep(0.01, 0.0, abs(mp.x) - 0.002) * smoothstep(0.6, 0.0, abs(mp.y));
    }
    color += vec3(1.0, 0.8, 0.5) * mandala * (0.5 + u_bass);

    // Glow
    float glow = exp(-dist * 3.0);
    color += vec3(0.2, 0.1, 0.4) * glow;

    color *= 1.0 - length(uv) * 0.3;

    // Beat flash - sacred geometry pulse
    color += vec3(0.9, 0.8, 1.0) * u_beat * exp(-dist * 2.0) * 0.8;
    color += vec3(1.0, 0.95, 0.9) * u_beat * 0.3;

    // Blend with video
    vec3 video = texture2D(u_video, screenUV).rgb;
    float videoPresence = step(0.01, dot(video, vec3(1.0)));
    color = mix(color, 1.0 - (1.0 - color) * (1.0 - video), videoPresence * 0.7);

    gl_FragColor = vec4(color, 1.0);
}
