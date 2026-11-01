#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
// Aurora - PAPAGEDON Signature Pack (rewritten original)
// Aurora storm: triple parallax curtains, light pillars, starfield with a
// meteor, mountain silhouette, horizon glow, and a shockwave on every kick.
in  vec2 vUV;
out vec4 fragColor;

uniform float uTime;
uniform vec2  uResolution;
uniform float uEnergy;
uniform float uIntensity;
uniform float uBass;
uniform float uMid;
uniform float uTreble;
uniform float uBeat;
uniform float uMood;
uniform vec3  uPrimaryColour;
uniform vec3  uSecondaryColour;
uniform vec3  uAccentColour;
uniform vec3  uBackground;
uniform float uGlow;
uniform float uBloom;
uniform float uMotion;
uniform float uNoise;
uniform float uDistortion;
uniform float uSaturationBase;
uniform float uSaturationScale;
uniform float uDetail;
uniform float uMasterBrightness;
uniform float uMasterGlow;
uniform float uMasterExposure;
uniform float uEvolutionPhase;
uniform sampler2D uSpectrum;

const float kPi  = 3.14159265358979;
const float kTau = 6.28318530717959;

vec3 palette(float t) {
    t = clamp(t, 0.0, 1.0);
    return t < 0.5 ? mix(uSecondaryColour, uPrimaryColour, t * 2.0)
                   : mix(uPrimaryColour,   uAccentColour,  (t - 0.5) * 2.0);
}
float hash21(vec2 p) { p = fract(p * vec2(123.34, 345.45)); p += dot(p, p + 34.345); return fract(p.x * p.y); }
float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
    float a = hash21(i), b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0)), d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p, int oct) {
    float s = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) {
        if (i >= oct) break;
        s += a * vnoise(p);
        p = p * 2.03 + vec2(1.7, 9.2);
        a *= 0.5;
    }
    return s;
}
vec3 aces(vec3 x) { return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0); }

// One aurora curtain: domain-warped band with a vertical falloff.
float curtain(vec2 p, float t, int oct, float seed, float amp) {
    vec2 q = vec2(fbm(p * 0.8 + vec2(seed, t * 0.10), oct),
                  fbm(p * 0.8 + vec2(seed + 5.2, 1.3 - t * 0.08), oct));
    float w = fbm(p * 0.8 + uDistortion * q + vec2(0.0, -t * 0.35), oct);
    float shape = smoothstep(0.32, 0.92, w);
    float vfall = 1.0 - smoothstep(-0.9, 1.1, p.y);
    return clamp((shape + uBass * 0.22) * (0.3 + 0.95 * vfall) * amp, 0.0, 1.0);
}

float hueBand(vec2 p) {
    return texture(uSpectrum, vec2(clamp(p.x * 0.18 + 0.5, 0.0, 1.0), 0.5)).r;
}

void main() {
    vec2 uv = (vUV * 2.0 - 1.0);
    uv.x *= uResolution.x / uResolution.y;

    // Physical beat pump, house strength.
    float kick = uBeat * uBeat;
    float pump = 1.0 - kick * 0.16 - uBass * 0.09 - uEnergy * 0.06;
    uv *= pump;

    float t = uTime * (0.3 + uEnergy * 0.2) * uMotion;
    float flow = t * (0.7 + uMid * 0.6);
    int oct = int(mix(2.0, 4.0, uDetail));

    // ── 1. Triple parallax curtains ───────────────────────────────────
    float c1 = curtain(uv * vec2(1.1, 0.8), flow, oct, 0.0, 0.75);
    float c2 = curtain(uv * vec2(1.6, 1.0) + vec2(3.7, 0.0), flow * 1.25, oct, 4.2, 1.0);
    float c3 = curtain(uv * vec2(2.3, 1.2) + vec2(9.1, 0.0), flow * 1.6, oct, 8.8, 1.1);
    float sp = hueBand(uv);
    vec3 sky = palette(c1 * 0.5 + sp * 0.25) * c1 * 0.5;
    sky += palette(c2 * 0.6 + sp * 0.35 + 0.1) * c2 * 0.8;
    sky += palette(c3 * 0.6 + sp * 0.45 + 0.2) * c3 * 1.1;

    // ── 2. Light pillars ──────────────────────────────────────────────
    float pil = pow(vnoise(vec2(uv.x * 14.0 + flow * 0.5 + uEvolutionPhase * 0.05, 1.7)), 3.0);
    float pvfall = 1.0 - smoothstep(-0.7, 1.2, uv.y);
    sky += uAccentColour * pil * pvfall * (0.5 + uTreble * 1.4 + uEnergy * 0.4);

    // ── 3. Starfield (two depths on High) ─────────────────────────────
    vec2 g1 = uv * 26.0;
    vec2 id1 = floor(g1);
    float h1 = hash21(id1);
    float tw1 = 0.5 + 0.5 * sin(uTime * (1.5 + uTreble * 6.0) + h1 * 40.0);
    vec2 so1 = fract(g1) - 0.5 - (vec2(h1, fract(h1 * 61.0)) - 0.5) * 0.6;
    float star1 = (1.0 - smoothstep(0.0, 0.06, length(so1))) * step(0.93, h1);
    sky += mix(uPrimaryColour, vec3(1.0), 0.5) * star1 * tw1 * (0.4 + uTreble * 0.8) * (1.0 - c3 * 0.7);
    if (uDetail > 0.5) {
        vec2 g2 = uv * 57.0 + vec2(3.1, 7.7);
        vec2 id2 = floor(g2);
        float h2 = hash21(id2);
        vec2 so2 = fract(g2) - 0.5 - (vec2(h2, fract(h2 * 37.0)) - 0.5) * 0.6;
        float star2 = (1.0 - smoothstep(0.0, 0.05, length(so2))) * step(0.955, h2);
        float tw2 = 0.5 + 0.5 * sin(uTime * (2.5 + uTreble * 8.0) + h2 * 55.0);
        sky += uAccentColour * star2 * tw2 * (0.3 + uTreble * 0.6) * (1.0 - c3 * 0.7);
    }

    // ── 4. Meteor with a burning trail ────────────────────────────────
    float mt = fract(flow * 0.09 + 0.3 + uEvolutionPhase * 0.01);
    vec2 mhead = vec2(mix(1.4, -1.4, mt), mix(0.9, 0.1, mt));
    vec2 mdir = normalize(vec2(-1.0, -0.45));
    vec2 rel = uv - mhead;
    float along = dot(rel, -mdir);
    float across = abs(dot(rel, vec2(-mdir.y, mdir.x)));
    float trail = exp(-across * across * 220.0) * exp(-max(along, 0.0) * 2.2) * step(0.0, along);
    float mcore = exp(-dot(rel, rel) * 260.0);
    sky += mix(uAccentColour, vec3(1.0), 0.6) * (trail * 0.9 + mcore * 1.6) * (1.0 - mt) * smoothstep(0.0, 0.06, mt);

    // ── 5. Mountain silhouette, snow edge, horizon glow ───────────────
    float ridge = -0.52 + (vnoise(vec2(uv.x * 2.3, 3.3)) - 0.5) * 0.5
                        + (vnoise(vec2(uv.x * 6.1, 9.7)) - 0.5) * 0.18;
    float sil = 1.0 - smoothstep(ridge - 0.015, ridge + 0.015, uv.y);
    float snow = (1.0 - smoothstep(0.0, 0.05, abs(uv.y - ridge))) * (0.4 + uEnergy * 0.5);
    sky += uPrimaryColour * exp(-abs(uv.y + 0.42) * 4.0) * (0.4 + uEnergy * 0.7);
    vec3 mountCol = uBackground * 0.9 + uSecondaryColour * 0.12;
    vec3 scene = mix(sky, mountCol, sil);
    scene += uAccentColour * snow * 0.3;

    // ── 6. Kick shockwave + burst ─────────────────────────────────────
    vec2 ruv = (uv - vec2(0.0, -0.3)) * vec2(1.0, 1.3);
    float rr = length(ruv);
    float ringR = (1.0 - kick) * 2.4 + 0.1;
    float ring = exp(-pow((rr - ringR) * 4.5, 2.0)) * kick;
    float burst = kick * exp(-rr * 1.8) * 1.6;

    float pattern = clamp(c1 * 0.3 + c2 * 0.4 + c3 * 0.5 + ring * 0.8 + burst, 0.0, 1.0);
    pattern = smoothstep(0.02, 0.88, pattern);
    vec3 color = scene + palette(pattern + uBass * 0.2 + burst * 0.3) * (ring + burst) * 1.4;

    float luma = dot(color, vec3(0.299, 0.587, 0.114));
    float sat  = clamp(uSaturationBase + 0.3 + uIntensity * uSaturationScale, 0.0, 1.35);
    color = mix(vec3(luma), color, sat);

    float brightness = (0.14 + uEnergy * 1.2) * uMasterExposure;
    color *= brightness * (0.45 + 0.8 * pattern);

    color += uBackground * (1.0 - pattern) * 1.3;

    color += color * kick * 1.0;
    color += color * uBass * 0.35;

    color += color * uGlow * uMasterGlow;
    color += color * color * uBloom * 1.2;
    color *= mix(vec3(0.9, 1.0, 1.1), vec3(1.1, 1.0, 0.9), clamp(uMood, 0.0, 1.0));
    if (uNoise > 0.001) { float gr = hash21(gl_FragCoord.xy + fract(uTime) * 137.0) - 0.5; color += gr * uNoise * 0.22; }
    float d = length(uv);
    color *= 1.0 - 0.28 * smoothstep(0.8, 1.7, d);
    color *= uMasterBrightness;
    color = aces(color * 1.2);
    fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
