// Preset 12: Fractal Zoom
uniform float u_time;
uniform float u_bass;
uniform float u_mid;
uniform float u_treble;
uniform float u_beat;
uniform vec2 u_resolution;
uniform sampler2D u_video;

#define PI 3.14159265359
#define MAX_ITER 100

vec2 complexMul(vec2 a, vec2 b) {
    return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
    vec2 screenUV = gl_FragCoord.xy / u_resolution.xy;
    float t = u_time;

    // Camera panning and zoom
    vec2 pan;
    pan.x = sin(t * 0.07) * 0.3 + sin(t * 0.11) * 0.15;
    pan.y = cos(t * 0.06) * 0.25 + cos(t * 0.09) * 0.1;

    // Continuous zoom
    float zoom = 2.0 + sin(t * 0.1) * 1.5;
    zoom *= 1.0 - u_bass * 0.3;

    // Rotation
    float rot = t * 0.05 + u_mid * 0.2;
    mat2 rotation = mat2(cos(rot), -sin(rot), sin(rot), cos(rot));

    vec2 c = rotation * (uv * zoom) + pan;

    // Target interesting location
    c += vec2(-0.7, 0.0);

    // Mandelbrot iteration
    vec2 z = vec2(0.0);
    float iter = 0.0;

    for (int i = 0; i < MAX_ITER; i++) {
        z = complexMul(z, z) + c;
        if (dot(z, z) > 4.0) break;
        iter += 1.0;
    }

    // Smooth coloring
    float smoothIter = iter;
    if (iter < float(MAX_ITER)) {
        float log_zn = log(dot(z, z)) / 2.0;
        float nu = log(log_zn / log(2.0)) / log(2.0);
        smoothIter = iter + 1.0 - nu;
    }

    // Color mapping
    vec3 color;

    if (iter >= float(MAX_ITER)) {
        // Inside the set - make it pulse
        float pulse = sin(t * 2.0 + length(c) * 10.0) * 0.5 + 0.5;
        color = vec3(0.0, 0.0, 0.1) + vec3(0.1, 0.0, 0.2) * pulse * u_bass;
    } else {
        // Outside - colorful bands
        float hue = smoothIter * 0.02 + t * 0.1 + u_treble * 0.5;

        color.r = sin(hue * PI * 2.0) * 0.5 + 0.5;
        color.g = sin(hue * PI * 2.0 + PI * 0.666) * 0.5 + 0.5;
        color.b = sin(hue * PI * 2.0 + PI * 1.333) * 0.5 + 0.5;

        // Intensity based on iteration count
        float intensity = 1.0 - smoothIter / float(MAX_ITER);
        color *= intensity * (0.7 + u_mid * 0.3);

        // Edge glow
        if (smoothIter < 10.0) {
            color += vec3(1.0, 0.8, 0.5) * (1.0 - smoothIter / 10.0) * 0.5;
        }
    }

    // Bass pulse
    color *= 1.0 + u_bass * 0.3;

    color *= 1.0 - length(uv) * 0.2;

    // Beat flash - fractal highlight
    color += vec3(0.9, 0.8, 1.0) * u_beat * 0.4;
    color *= 1.0 + u_beat * 0.5;

    // Blend with video
    vec3 video = texture2D(u_video, screenUV).rgb;
    float videoPresence = step(0.01, dot(video, vec3(1.0)));
    color = mix(color, 1.0 - (1.0 - color) * (1.0 - video), videoPresence * 0.7);

    gl_FragColor = vec4(color, 1.0);
}
