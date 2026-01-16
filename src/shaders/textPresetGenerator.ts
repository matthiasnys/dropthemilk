// Generate a text visualization shader with custom text

const shaderHeader = `
uniform float u_time;
uniform float u_bass;
uniform float u_mid;
uniform float u_treble;
uniform float u_beat;
uniform vec2 u_resolution;

#define PI 3.14159265359

// SDF primitives
float sdBox(vec2 p, vec2 b) {
    vec2 d = abs(p) - b;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

float sdCircle(vec2 p, float r) {
    return length(p) - r;
}

// Letter SDFs - uppercase
float letterA(vec2 p) {
    p.y -= 0.05;
    float left = sdBox(vec2(p.x + 0.15 - p.y * 0.25, p.y), vec2(0.06, 0.35));
    float right = sdBox(vec2(p.x - 0.15 + p.y * 0.25, p.y), vec2(0.06, 0.35));
    float bar = sdBox(p - vec2(0.0, -0.05), vec2(0.18, 0.05));
    return min(min(left, right), bar);
}

float letterB(vec2 p) {
    float stem = sdBox(p - vec2(-0.15, 0.0), vec2(0.06, 0.35));
    vec2 pt = p - vec2(0.0, 0.17);
    float top = abs(length(vec2(max(pt.x, 0.0), pt.y)) - 0.15) - 0.06;
    top = max(top, -p.x - 0.15);
    vec2 pb = p - vec2(0.0, -0.13);
    float bot = abs(length(vec2(max(pb.x, 0.0), pb.y)) - 0.18) - 0.06;
    bot = max(bot, -p.x - 0.15);
    return min(stem, min(top, bot));
}

float letterC(vec2 p) {
    float d = abs(length(p) - 0.3) - 0.06;
    float cut = sdBox(p - vec2(0.25, 0.0), vec2(0.2, 0.2));
    return max(d, -cut);
}

float letterD(vec2 p) {
    float stem = sdBox(p - vec2(-0.15, 0.0), vec2(0.06, 0.35));
    float curve = abs(length(vec2(max(p.x + 0.1, 0.0), p.y)) - 0.3) - 0.06;
    curve = max(curve, -p.x - 0.15);
    return min(stem, curve);
}

float letterE(vec2 p) {
    float stem = sdBox(p - vec2(-0.15, 0.0), vec2(0.06, 0.35));
    float top = sdBox(p - vec2(0.05, 0.29), vec2(0.2, 0.06));
    float mid = sdBox(p - vec2(0.0, 0.0), vec2(0.15, 0.06));
    float bot = sdBox(p - vec2(0.05, -0.29), vec2(0.2, 0.06));
    return min(min(stem, top), min(mid, bot));
}

float letterF(vec2 p) {
    float stem = sdBox(p - vec2(-0.15, 0.0), vec2(0.06, 0.35));
    float top = sdBox(p - vec2(0.05, 0.29), vec2(0.2, 0.06));
    float mid = sdBox(p - vec2(0.0, 0.0), vec2(0.15, 0.06));
    return min(min(stem, top), mid);
}

float letterG(vec2 p) {
    float d = abs(length(p) - 0.3) - 0.06;
    float cut = sdBox(p - vec2(0.2, 0.15), vec2(0.2, 0.25));
    d = max(d, -cut);
    float bar = sdBox(p - vec2(0.1, 0.0), vec2(0.2, 0.06));
    return min(d, bar);
}

float letterH(vec2 p) {
    float left = sdBox(p - vec2(-0.2, 0.0), vec2(0.06, 0.35));
    float right = sdBox(p - vec2(0.2, 0.0), vec2(0.06, 0.35));
    float bar = sdBox(p, vec2(0.2, 0.06));
    return min(min(left, right), bar);
}

float letterI(vec2 p) {
    float stem = sdBox(p, vec2(0.06, 0.35));
    float top = sdBox(p - vec2(0.0, 0.29), vec2(0.15, 0.06));
    float bot = sdBox(p - vec2(0.0, -0.29), vec2(0.15, 0.06));
    return min(min(stem, top), bot);
}

float letterJ(vec2 p) {
    float stem = sdBox(p - vec2(0.1, 0.1), vec2(0.06, 0.25));
    float top = sdBox(p - vec2(0.0, 0.29), vec2(0.2, 0.06));
    float curve = abs(length(p - vec2(-0.1, -0.15)) - 0.2) - 0.06;
    curve = max(curve, p.y + 0.15);
    curve = max(curve, -p.x - 0.1);
    return min(min(stem, top), curve);
}

float letterK(vec2 p) {
    float stem = sdBox(p - vec2(-0.2, 0.0), vec2(0.06, 0.35));
    float top = sdBox(vec2(p.x - 0.0 + (p.y - 0.15) * 0.7, p.y - 0.15), vec2(0.06, 0.22));
    float bot = sdBox(vec2(p.x - 0.0 - (p.y + 0.15) * 0.7, p.y + 0.15), vec2(0.06, 0.22));
    return min(stem, min(top, bot));
}

float letterL(vec2 p) {
    float stem = sdBox(p - vec2(-0.1, 0.1), vec2(0.06, 0.35));
    float base = sdBox(p - vec2(0.05, -0.29), vec2(0.2, 0.06));
    return min(stem, base);
}

float letterM(vec2 p) {
    float left = sdBox(p - vec2(-0.25, 0.0), vec2(0.06, 0.35));
    float right = sdBox(p - vec2(0.25, 0.0), vec2(0.06, 0.35));
    float diagL = sdBox(vec2(p.x + 0.12 - (0.35 - p.y) * 0.2, p.y - 0.1), vec2(0.05, 0.25));
    float diagR = sdBox(vec2(p.x - 0.12 + (0.35 - p.y) * 0.2, p.y - 0.1), vec2(0.05, 0.25));
    return min(min(left, right), min(diagL, diagR));
}

float letterN(vec2 p) {
    float left = sdBox(p - vec2(-0.2, 0.0), vec2(0.06, 0.35));
    float right = sdBox(p - vec2(0.2, 0.0), vec2(0.06, 0.35));
    float diag = sdBox(vec2(p.x - p.y * 0.55, p.y), vec2(0.06, 0.35));
    return min(min(left, right), diag);
}

float letterO(vec2 p) {
    return abs(length(p) - 0.3) - 0.06;
}

float letterP(vec2 p) {
    float stem = sdBox(p - vec2(-0.15, 0.0), vec2(0.06, 0.35));
    vec2 pt = p - vec2(0.0, 0.15);
    float bump = abs(length(vec2(max(pt.x, 0.0), pt.y)) - 0.18) - 0.06;
    bump = max(bump, -p.x - 0.15);
    return min(stem, bump);
}

float letterQ(vec2 p) {
    float o = abs(length(p) - 0.3) - 0.06;
    float tail = sdBox(vec2(p.x - p.y - 0.3, p.y + 0.2), vec2(0.15, 0.05));
    return min(o, tail);
}

float letterR(vec2 p) {
    float stem = sdBox(p - vec2(-0.15, 0.0), vec2(0.06, 0.35));
    vec2 pt = p - vec2(0.0, 0.15);
    float bump = abs(length(vec2(max(pt.x, 0.0), pt.y)) - 0.18) - 0.06;
    bump = max(bump, -p.x - 0.15);
    float leg = sdBox(vec2(p.x - 0.1 - (0.0 - p.y) * 0.5, p.y + 0.15), vec2(0.06, 0.2));
    return min(min(stem, bump), leg);
}

float letterS(vec2 p) {
    vec2 pt = p - vec2(0.0, 0.15);
    float top = abs(length(pt) - 0.18) - 0.06;
    top = max(top, -pt.x);
    top = max(top, pt.y - 0.15);
    vec2 pb = p - vec2(0.0, -0.15);
    float bot = abs(length(pb) - 0.18) - 0.06;
    bot = max(bot, pb.x);
    bot = max(bot, -pb.y - 0.15);
    return min(top, bot);
}

float letterT(vec2 p) {
    float stem = sdBox(p - vec2(0.0, -0.05), vec2(0.06, 0.3));
    float top = sdBox(p - vec2(0.0, 0.29), vec2(0.25, 0.06));
    return min(stem, top);
}

float letterU(vec2 p) {
    p.y += 0.1;
    float d = abs(length(vec2(p.x, min(p.y, 0.0))) - 0.25) - 0.06;
    float stem1 = sdBox(p - vec2(-0.25, 0.15), vec2(0.06, 0.25));
    float stem2 = sdBox(p - vec2(0.25, 0.15), vec2(0.06, 0.25));
    return min(d, min(stem1, stem2));
}

float letterV(vec2 p) {
    p.y += 0.05;
    float left = sdBox(vec2(p.x + 0.15 + p.y * 0.3, p.y), vec2(0.06, 0.35));
    float right = sdBox(vec2(p.x - 0.15 - p.y * 0.3, p.y), vec2(0.06, 0.35));
    return min(left, right);
}

float letterW(vec2 p) {
    p.y += 0.05;
    float l1 = sdBox(vec2(p.x + 0.25 + p.y * 0.2, p.y), vec2(0.05, 0.35));
    float l2 = sdBox(vec2(p.x + 0.08 - p.y * 0.15, p.y), vec2(0.05, 0.35));
    float r1 = sdBox(vec2(p.x - 0.08 + p.y * 0.15, p.y), vec2(0.05, 0.35));
    float r2 = sdBox(vec2(p.x - 0.25 - p.y * 0.2, p.y), vec2(0.05, 0.35));
    return min(min(l1, l2), min(r1, r2));
}

float letterX(vec2 p) {
    float d1 = sdBox(vec2(p.x - p.y * 0.5, p.y), vec2(0.06, 0.4));
    float d2 = sdBox(vec2(p.x + p.y * 0.5, p.y), vec2(0.06, 0.4));
    return min(d1, d2);
}

float letterY(vec2 p) {
    float stem = sdBox(p - vec2(0.0, -0.15), vec2(0.06, 0.2));
    float left = sdBox(vec2(p.x + 0.12 + (p.y - 0.2) * 0.4, p.y - 0.2), vec2(0.06, 0.15));
    float right = sdBox(vec2(p.x - 0.12 - (p.y - 0.2) * 0.4, p.y - 0.2), vec2(0.06, 0.15));
    return min(stem, min(left, right));
}

float letterZ(vec2 p) {
    float top = sdBox(p - vec2(0.0, 0.29), vec2(0.25, 0.06));
    float bot = sdBox(p - vec2(0.0, -0.29), vec2(0.25, 0.06));
    float diag = sdBox(vec2(p.x + p.y * 0.4, p.y), vec2(0.06, 0.35));
    return min(min(top, bot), diag);
}

float letterDot(vec2 p) {
    return sdCircle(p - vec2(0.0, -0.25), 0.08);
}

float letterComma(vec2 p) {
    float dot = sdCircle(p - vec2(0.0, -0.25), 0.08);
    float tail = sdBox(p - vec2(-0.03, -0.35), vec2(0.04, 0.08));
    return min(dot, tail);
}

float letterExclaim(vec2 p) {
    float stem = sdBox(p - vec2(0.0, 0.1), vec2(0.06, 0.25));
    float dot = sdCircle(p - vec2(0.0, -0.28), 0.07);
    return min(stem, dot);
}

float letterQuestion(vec2 p) {
    vec2 pt = p - vec2(0.0, 0.18);
    float curve = abs(length(pt) - 0.18) - 0.06;
    curve = max(curve, -pt.y - 0.1);
    float stem = sdBox(p - vec2(0.0, -0.08), vec2(0.06, 0.1));
    float dot = sdCircle(p - vec2(0.0, -0.28), 0.07);
    return min(min(curve, stem), dot);
}

float letterColon(vec2 p) {
    float top = sdCircle(p - vec2(0.0, 0.12), 0.07);
    float bot = sdCircle(p - vec2(0.0, -0.15), 0.07);
    return min(top, bot);
}

float letterHyphen(vec2 p) {
    return sdBox(p, vec2(0.15, 0.05));
}

float letterSpace(vec2 p) {
    return 1000.0;
}

float letter0(vec2 p) { return letterO(p); }
float letter1(vec2 p) { return letterI(p); }
float letter2(vec2 p) {
    vec2 pt = p - vec2(0.0, 0.15);
    float top = abs(length(pt) - 0.18) - 0.06;
    top = max(top, pt.y - 0.15);
    float diag = sdBox(vec2(p.x + 0.1 + (p.y + 0.1) * 0.5, p.y + 0.05), vec2(0.06, 0.22));
    float bot = sdBox(p - vec2(0.0, -0.29), vec2(0.25, 0.06));
    return min(min(top, diag), bot);
}
float letter3(vec2 p) {
    vec2 pt = p - vec2(0.0, 0.15);
    float top = abs(length(pt) - 0.16) - 0.06;
    top = max(top, -pt.x - 0.05);
    vec2 pb = p - vec2(0.0, -0.15);
    float bot = abs(length(pb) - 0.16) - 0.06;
    bot = max(bot, -pb.x - 0.05);
    return min(top, bot);
}
float letter4(vec2 p) {
    float vert = sdBox(p - vec2(0.15, 0.0), vec2(0.06, 0.35));
    float horiz = sdBox(p - vec2(0.0, -0.05), vec2(0.25, 0.05));
    float diag = sdBox(p - vec2(-0.1, 0.15), vec2(0.06, 0.22));
    return min(min(vert, horiz), diag);
}
float letter5(vec2 p) {
    float top = sdBox(p - vec2(0.0, 0.29), vec2(0.22, 0.06));
    float stem = sdBox(p - vec2(-0.16, 0.15), vec2(0.06, 0.14));
    float mid = sdBox(p - vec2(-0.05, 0.02), vec2(0.17, 0.05));
    vec2 pb = p - vec2(0.0, -0.18);
    float curve = abs(length(pb) - 0.16) - 0.06;
    curve = max(curve, -pb.x - 0.05);
    curve = max(curve, pb.y);
    return min(min(top, stem), min(mid, curve));
}
float letter6(vec2 p) {
    float outer = abs(length(p - vec2(0.0, -0.1)) - 0.22) - 0.06;
    float stem = sdBox(p - vec2(-0.22, 0.1), vec2(0.06, 0.2));
    vec2 pt = p - vec2(-0.08, 0.28);
    float top = abs(length(pt) - 0.14) - 0.05;
    top = max(top, -pt.y);
    return min(min(outer, stem), top);
}
float letter7(vec2 p) {
    float top = sdBox(p - vec2(0.0, 0.29), vec2(0.25, 0.06));
    float diag = sdBox(vec2(p.x - 0.1 + (p.y + 0.1) * 0.35, p.y), vec2(0.06, 0.35));
    return min(top, diag);
}
float letter8(vec2 p) {
    vec2 pt = p - vec2(0.0, 0.15);
    float top = abs(length(pt) - 0.16) - 0.06;
    vec2 pb = p - vec2(0.0, -0.15);
    float bot = abs(length(pb) - 0.18) - 0.06;
    return min(top, bot);
}
float letter9(vec2 p) {
    float outer = abs(length(p - vec2(0.0, 0.1)) - 0.22) - 0.06;
    float stem = sdBox(p - vec2(0.22, -0.1), vec2(0.06, 0.2));
    vec2 pb = p - vec2(0.08, -0.28);
    float bot = abs(length(pb) - 0.14) - 0.05;
    bot = max(bot, pb.y);
    return min(min(outer, stem), bot);
}

float getLetter(vec2 p, int charCode) {
    if (charCode == 32) return letterSpace(p);
    if (charCode == 33) return letterExclaim(p);
    if (charCode == 44) return letterComma(p);
    if (charCode == 45) return letterHyphen(p);
    if (charCode == 46) return letterDot(p);
    if (charCode == 58) return letterColon(p);
    if (charCode == 63) return letterQuestion(p);
    if (charCode >= 48 && charCode <= 57) {
        if (charCode == 48) return letter0(p);
        if (charCode == 49) return letter1(p);
        if (charCode == 50) return letter2(p);
        if (charCode == 51) return letter3(p);
        if (charCode == 52) return letter4(p);
        if (charCode == 53) return letter5(p);
        if (charCode == 54) return letter6(p);
        if (charCode == 55) return letter7(p);
        if (charCode == 56) return letter8(p);
        if (charCode == 57) return letter9(p);
    }
    // Uppercase and lowercase map to same
    int upper = charCode;
    if (charCode >= 97 && charCode <= 122) upper = charCode - 32;
    if (upper == 65) return letterA(p);
    if (upper == 66) return letterB(p);
    if (upper == 67) return letterC(p);
    if (upper == 68) return letterD(p);
    if (upper == 69) return letterE(p);
    if (upper == 70) return letterF(p);
    if (upper == 71) return letterG(p);
    if (upper == 72) return letterH(p);
    if (upper == 73) return letterI(p);
    if (upper == 74) return letterJ(p);
    if (upper == 75) return letterK(p);
    if (upper == 76) return letterL(p);
    if (upper == 77) return letterM(p);
    if (upper == 78) return letterN(p);
    if (upper == 79) return letterO(p);
    if (upper == 80) return letterP(p);
    if (upper == 81) return letterQ(p);
    if (upper == 82) return letterR(p);
    if (upper == 83) return letterS(p);
    if (upper == 84) return letterT(p);
    if (upper == 85) return letterU(p);
    if (upper == 86) return letterV(p);
    if (upper == 87) return letterW(p);
    if (upper == 88) return letterX(p);
    if (upper == 89) return letterY(p);
    if (upper == 90) return letterZ(p);
    return 1000.0;
}

// Noise
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
`;

function generateTextFunction(text: string): string {
  const chars = text.split('');
  const spacing = 0.55;
  const totalWidth = chars.length * spacing;
  const startX = -totalWidth / 2 + spacing / 2;

  let code = `
float textCustom(vec2 p, float spread) {
    float d = 1000.0;
    float spacing = ${spacing.toFixed(3)} * spread;
    float startX = ${startX.toFixed(3)} * spread;
`;

  chars.forEach((char, i) => {
    const charCode = char.charCodeAt(0);
    code += `    d = min(d, getLetter(p - vec2(startX + spacing * ${i.toFixed(1)}, 0.0), ${charCode}));\n`;
  });

  code += `    return d;
}
`;
  return code;
}

const shaderMain = `
void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
    float t = u_time;

    // === CAMERA PANNING ===
    // Smooth panning motion - sweeps across the scene
    vec2 pan = vec2(0.0);
    pan.x = sin(t * 0.15) * 0.8 + sin(t * 0.23) * 0.4;  // Horizontal sweep
    pan.y = cos(t * 0.12) * 0.4 + sin(t * 0.19) * 0.2;  // Vertical drift

    // Add some faster micro-movements
    pan.x += sin(t * 0.7) * 0.05;
    pan.y += cos(t * 0.6) * 0.03;

    // Audio-reactive camera shake
    pan += vec2(sin(t * 8.0), cos(t * 7.0)) * u_bass * 0.08;

    // Apply pan to base UV
    vec2 pannedUV = uv + pan;

    // Background - moving gradient (uses panned UV)
    vec2 bgUV = pannedUV + vec2(sin(t * 0.1), cos(t * 0.15)) * 0.3;
    vec3 bgColor = mix(
        vec3(0.0, 0.02, 0.15),
        vec3(0.02, 0.0, 0.1),
        sin(bgUV.x * 2.0 + bgUV.y * 2.0 + t * 0.2) * 0.5 + 0.5
    );
    float bgNoise = snoise(pannedUV * 3.0 + t * 0.2) * 0.5 + 0.5;
    bgColor += vec3(0.02, 0.0, 0.05) * bgNoise;

    // Moving nebula clouds in background
    float nebula1 = snoise(pannedUV * 1.5 + t * 0.1);
    float nebula2 = snoise(pannedUV * 2.5 - t * 0.15);
    bgColor += vec3(0.1, 0.0, 0.15) * (nebula1 * 0.5 + 0.5) * 0.3;
    bgColor += vec3(0.0, 0.05, 0.1) * (nebula2 * 0.5 + 0.5) * 0.2;

    // === TEXT TRANSFORMATION ===
    vec2 textUV = pannedUV;

    // Additional floating motion on top of pan
    textUV.x -= sin(t * 0.3) * 0.1;
    textUV.y -= cos(t * 0.25) * 0.08;

    // Gentle rotation
    float rot = sin(t * 0.18) * 0.08 + cos(t * 0.13) * 0.05;
    mat2 rotation = mat2(cos(rot), -sin(rot), sin(rot), cos(rot));
    textUV = rotation * textUV;

    // Wave distortion
    textUV.x += sin(pannedUV.y * 8.0 + t * 2.0) * (0.015 + u_bass * 0.05);
    textUV.y += cos(pannedUV.x * 6.0 + t * 1.5) * (0.01 + u_mid * 0.04);

    // Breathing/pulsing scale
    float breathe = 1.0 + sin(t * 0.4) * 0.08;
    float scale = breathe + u_bass * 0.25;
    textUV /= scale;

    // Zoom in/out slowly - more dramatic
    float zoom = 0.9 + sin(t * 0.08) * 0.25 + cos(t * 0.11) * 0.15;
    textUV *= zoom;

    float spread = 1.0 + u_treble * 0.1;
    float d = textCustom(textUV, spread);

    vec3 color = bgColor;

    // Glows
    float outerGlow = exp(-d * 3.0) * (0.3 + u_bass * 0.7);
    color += vec3(0.0, 0.5, 1.0) * outerGlow;

    float midGlow = exp(-d * 6.0) * (0.5 + u_mid * 0.5);
    color += vec3(0.2, 0.4, 1.0) * midGlow;

    float innerGlow = exp(-d * 15.0) * (0.8 + u_treble * 0.2);
    color += vec3(0.7, 0.9, 1.0) * innerGlow;

    // Sharp edge
    float textMask = smoothstep(0.02, 0.0, d);
    vec3 textColor = mix(
        vec3(0.0, 0.6, 1.0),
        vec3(0.4, 0.8, 1.0),
        sin(t + uv.x * 5.0) * 0.5 + 0.5
    );
    color = mix(color, textColor, textMask);

    // Chromatic aberration
    float caOffset = 0.01 * (1.0 + u_bass * 2.0);
    float dR = textCustom(textUV + vec2(caOffset, 0.0), spread);
    float dB = textCustom(textUV - vec2(caOffset, 0.0), spread);
    color.r += exp(-dR * 8.0) * 0.3 * u_bass;
    color.b += exp(-dB * 8.0) * 0.3 * u_bass;

    // Scanlines
    float scanline = sin(gl_FragCoord.y * 2.0) * 0.03 + 0.97;
    color *= scanline;

    // Orbiting particles around text (follow the pan)
    for (float i = 0.0; i < 25.0; i++) {
        float seed = i * 123.456;
        float orbitSpeed = 0.2 + fract(seed * 0.1) * 0.5;
        float orbitRadius = 0.4 + fract(seed * 0.2) * 0.8;
        float orbitOffset = seed;
        vec2 particlePos = vec2(
            cos(t * orbitSpeed + orbitOffset) * orbitRadius,
            sin(t * orbitSpeed * 1.3 + orbitOffset) * orbitRadius * 0.7
        );
        // Particles follow the camera pan
        particlePos -= pan;

        float particleDist = length(uv - particlePos);
        float sparkle = exp(-particleDist * 35.0) * (0.4 + u_treble * 0.6);
        sparkle *= sin(t * 6.0 + seed) * 0.3 + 0.7;
        vec3 particleColor = mix(
            vec3(0.3, 0.6, 1.0),
            vec3(0.8, 0.4, 1.0),
            fract(seed * 0.3)
        );
        color += particleColor * sparkle * 0.35;
    }

    // Trailing light streaks (follow the pan)
    for (float i = 0.0; i < 8.0; i++) {
        float seed = i * 456.789;
        float streakT = fract(t * 0.15 + seed * 0.1);
        float angle = seed * 0.5 + t * 0.1;
        vec2 streakStart = vec2(
            cos(angle) * 1.2,
            sin(angle) * 0.8
        );
        vec2 streakDir = vec2(cos(angle + 1.5), sin(angle + 1.5)) * 0.6;
        vec2 streakPos = streakStart + streakDir * streakT;
        streakPos -= pan;  // Follow camera

        float streakDist = length(uv - streakPos);
        float streak = exp(-streakDist * 25.0) * (1.0 - streakT) * (0.5 + u_mid * 0.5);
        color += vec3(0.5, 0.8, 1.0) * streak * 0.25;
    }

    // Floating dust particles in foreground
    for (float i = 0.0; i < 15.0; i++) {
        float seed = i * 789.123;
        vec2 dustPos = vec2(
            sin(seed * 1.1 + t * 0.3) * 1.5,
            cos(seed * 0.9 + t * 0.25) * 1.0
        );
        dustPos -= pan * 0.5;  // Parallax - moves slower than camera

        float dustDist = length(uv - dustPos);
        float dust = exp(-dustDist * 50.0) * 0.3;
        dust *= sin(t * 3.0 + seed) * 0.5 + 0.5;
        color += vec3(0.6, 0.7, 1.0) * dust;
    }

    // Beat flash - bright pulse on detected beats
    color += vec3(0.6, 0.8, 1.0) * u_beat * 0.4;
    color += vec3(1.0, 0.9, 0.95) * u_beat * textMask * 0.5;

    // Vignette (based on original uv, not panned)
    float vignette = 1.0 - length(uv) * 0.3;
    color *= vignette;

    color *= 0.8 + u_bass * 0.3 + u_mid * 0.2;

    gl_FragColor = vec4(color, 1.0);
}
`;

export function generateTextShader(text: string): string {
  return shaderHeader + generateTextFunction(text) + shaderMain;
}
