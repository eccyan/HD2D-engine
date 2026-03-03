#version 450

layout(location = 0) in vec2 frag_uv;
layout(location = 0) out vec4 out_color;

layout(set = 0, binding = 0) uniform sampler2D scene_tex;
layout(set = 0, binding = 1) uniform sampler2D bloom_tex;

layout(push_constant) uniform PushConstants {
    float bloom_intensity;
    float exposure;
    float vignette_radius;
    float vignette_softness;
} pc;

void main() {
    vec3 scene = texture(scene_tex, frag_uv).rgb;
    vec3 bloom = texture(bloom_tex, frag_uv).rgb;

    // Additive bloom
    vec3 color = scene + bloom * pc.bloom_intensity;

    // Reinhard tone mapping
    color = vec3(1.0) - exp(-color * pc.exposure);

    // Vignette
    vec2 uv_centered = frag_uv - 0.5;
    float dist = length(uv_centered);
    float vignette = smoothstep(pc.vignette_radius, pc.vignette_radius - pc.vignette_softness, dist);
    color *= vignette;

    out_color = vec4(color, 1.0);
}
