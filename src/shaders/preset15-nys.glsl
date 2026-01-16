// NYS Text Shader with audio-reactive effects
uniform float u_time;
uniform float u_bass;
uniform float u_mid;
uniform float u_treble;
uniform float u_beat;
uniform vec2 u_resolution;
uniform sampler2D u_video;

// SDF for rounded box
float sdBox(vec2 p, vec2 b, float r) {
    vec2 d = abs(p) - b + r;
    return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)) - r;
}

// Letter N
float letterN(vec2 p) {
    float d = 1.0;
    // Left vertical
    d = min(d, sdBox(p - vec2(-0.3, 0.0), vec2(0.08, 0.5), 0.02));
    // Right vertical
    d = min(d, sdBox(p - vec2(0.3, 0.0), vec2(0.08, 0.5), 0.02));
    // Diagonal
    vec2 dp = p;
    float angle = -0.52;
    mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    dp = rot * dp;
    d = min(d, sdBox(dp, vec2(0.08, 0.55), 0.02));
    return d;
}

// Letter Y
float letterY(vec2 p) {
    float d = 1.0;
    // Bottom vertical
    d = min(d, sdBox(p - vec2(0.0, -0.25), vec2(0.08, 0.28), 0.02));
    // Top left diagonal
    vec2 dp1 = p - vec2(-0.18, 0.25);
    float angle1 = 0.45;
    mat2 rot1 = mat2(cos(angle1), -sin(angle1), sin(angle1), cos(angle1));
    dp1 = rot1 * dp1;
    d = min(d, sdBox(dp1, vec2(0.08, 0.32), 0.02));
    // Top right diagonal
    vec2 dp2 = p - vec2(0.18, 0.25);
    float angle2 = -0.45;
    mat2 rot2 = mat2(cos(angle2), -sin(angle2), sin(angle2), cos(angle2));
    dp2 = rot2 * dp2;
    d = min(d, sdBox(dp2, vec2(0.08, 0.32), 0.02));
    return d;
}

// Letter S
float letterS(vec2 p) {
    float d = 1.0;
    // Top curve (approximated with boxes)
    d = min(d, sdBox(p - vec2(0.0, 0.35), vec2(0.25, 0.08), 0.02));
    d = min(d, sdBox(p - vec2(-0.22, 0.22), vec2(0.08, 0.18), 0.02));
    // Middle
    d = min(d, sdBox(p - vec2(0.0, 0.0), vec2(0.22, 0.08), 0.02));
    // Bottom curve
    d = min(d, sdBox(p - vec2(0.22, -0.22), vec2(0.08, 0.18), 0.02));
    d = min(d, sdBox(p - vec2(0.0, -0.35), vec2(0.25, 0.08), 0.02));
    return d;
}

// Hash for noise
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
    vec2 screenUV = gl_FragCoord.xy / u_resolution.xy;

    float t = u_time;

    // Zoom/pulse with bass
    float zoom = 1.0 - u_bass * 0.15;
    uv *= zoom;

    // Slight rotation with mid
    float rotAngle = sin(t * 0.5) * 0.05 + u_mid * 0.1 * sin(t * 2.0);
    mat2 globalRot = mat2(cos(rotAngle), -sin(rotAngle), sin(rotAngle), cos(rotAngle));
    uv = globalRot * uv;

    // Letter positions with wave animation
    float wave = sin(t * 2.0) * 0.02 * u_treble;

    vec2 nPos = uv - vec2(-0.85, sin(t * 3.0) * 0.03 * u_bass);
    vec2 yPos = uv - vec2(0.0, sin(t * 3.0 + 1.0) * 0.03 * u_bass);
    vec2 sPos = uv - vec2(0.85, sin(t * 3.0 + 2.0) * 0.03 * u_bass);

    // Scale letters
    float scale = 1.3;
    nPos *= scale;
    yPos *= scale;
    sPos *= scale;

    // Get distances
    float dN = letterN(nPos);
    float dY = letterY(yPos);
    float dS = letterS(sPos);

    float d = min(min(dN, dY), dS);

    // Background gradient
    vec3 bg1 = vec3(0.05, 0.0, 0.15);
    vec3 bg2 = vec3(0.0, 0.05, 0.2);
    vec3 color = mix(bg1, bg2, screenUV.y + sin(t * 0.5) * 0.1);

    // Add some background particles
    for (float i = 0.0; i < 20.0; i++) {
        vec2 particlePos = vec2(
            hash(vec2(i, 0.0)) - 0.5,
            mod(hash(vec2(i, 1.0)) - t * 0.1 * (0.5 + hash(vec2(i, 2.0))), 1.0) - 0.5
        ) * 2.5;
        float particle = smoothstep(0.02, 0.0, length(uv - particlePos));
        color += particle * vec3(0.3, 0.5, 1.0) * (0.3 + u_treble * 0.7);
    }

    // Glow effect
    float glow = exp(-d * 8.0) * (0.5 + u_bass * 0.5);
    vec3 glowColor = vec3(0.4, 0.6, 1.0);
    color += glow * glowColor;

    // Stronger glow on bass
    float bassGlow = exp(-d * 4.0) * u_bass * 0.8;
    color += bassGlow * vec3(1.0, 0.3, 0.8);

    // Main letter fill with gradient
    float fill = smoothstep(0.02, 0.0, d);
    vec3 letterColor1 = vec3(0.2, 0.5, 1.0);
    vec3 letterColor2 = vec3(1.0, 0.3, 0.8);
    vec3 letterColor = mix(letterColor1, letterColor2, sin(t + uv.x * 2.0) * 0.5 + 0.5);
    letterColor = mix(letterColor, vec3(1.0), u_bass * 0.3);
    color = mix(color, letterColor, fill);

    // Edge highlight
    float edge = smoothstep(0.03, 0.01, abs(d)) * (0.5 + u_treble * 0.5);
    color += edge * vec3(1.0, 1.0, 1.0) * 0.5;

    // Scanline effect
    float scanline = sin(screenUV.y * 400.0 + t * 5.0) * 0.03;
    color -= scanline * u_mid;

    // Chromatic aberration on bass hits
    float chromaOffset = u_bass * 0.003;
    vec2 uvR = screenUV + vec2(chromaOffset, 0.0);
    vec2 uvB = screenUV - vec2(chromaOffset, 0.0);

    // Vignette
    float vignette = 1.0 - length(uv) * 0.4;
    color *= vignette;

    // Beat flash - NYS brand burst
    color += vec3(0.6, 0.8, 1.0) * u_beat * fill * 0.6;  // Letters flash
    color += vec3(1.0, 0.5, 0.9) * u_beat * 0.35;  // Overall flash
    color *= 1.0 + u_beat * 0.5;

    // Video blend
    vec3 video = texture2D(u_video, screenUV).rgb;
    float videoPresence = step(0.01, dot(video, vec3(1.0)));
    color = mix(color, 1.0 - (1.0 - color) * (1.0 - video), videoPresence * 0.7);

    gl_FragColor = vec4(color, 1.0);
}
