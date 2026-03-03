#version 450

layout(location = 0) in vec2 frag_uv;
layout(location = 0) out vec4 out_color;

layout(set = 0, binding = 0) uniform sampler2D scene_tex;
layout(set = 0, binding = 1) uniform sampler2D bloom_tex;
layout(set = 0, binding = 2) uniform sampler2D dof_tex;
layout(set = 0, binding = 3) uniform sampler2D depth_tex;

layout(push_constant) uniform PushConstants {
    // vec4 0: bloom params
    float bloom_intensity;
    float exposure;
    float vignette_radius;
    float vignette_softness;
    // vec4 1: DoF params
    float dof_focus_distance;
    float dof_focus_range;
    float dof_max_blur;
    float _pad0;
    // vec4 2: depth + fog density
    float depth_A;  // far / (far - near)
    float depth_B;  // near * far / (far - near)
    float fog_density;
    float _pad1;
    // vec4 3: fog color
    float fog_r;
    float fog_g;
    float fog_b;
    float _pad2;
} pc;

void main() {
    vec3 scene = texture(scene_tex, frag_uv).rgb;
    vec3 bloom = texture(bloom_tex, frag_uv).rgb;
    vec3 dof_blurred = texture(dof_tex, frag_uv).rgb;

    // Linearize depth: linear_z = B / (A - raw_depth)
    float raw_depth = texture(depth_tex, frag_uv).r;
    float linear_z = pc.depth_B / (pc.depth_A - raw_depth);

    // Circle of confusion from depth distance to focus plane
    float coc = smoothstep(0.0, pc.dof_focus_range,
                           abs(linear_z - pc.dof_focus_distance)) * pc.dof_max_blur;

    // Tilt-shift Y-bias: blur top and bottom edges for miniature/diorama look
    coc += abs(frag_uv.y - 0.45) * 0.3 * pc.dof_max_blur;
    coc = clamp(coc, 0.0, 1.0);

    // DoF blend
    vec3 color = mix(scene, dof_blurred, coc);

    // Depth-based fog (exponential squared)
    if (pc.fog_density > 0.0) {
        float fog_amount = 1.0 - exp(-pc.fog_density * linear_z * linear_z);
        fog_amount = clamp(fog_amount, 0.0, 1.0);
        vec3 fog_col = vec3(pc.fog_r, pc.fog_g, pc.fog_b);
        color = mix(color, fog_col, fog_amount);
    }

    // Additive bloom
    color = color + bloom * pc.bloom_intensity;

    // Reinhard tone mapping
    color = vec3(1.0) - exp(-color * pc.exposure);

    // Vignette
    vec2 uv_centered = frag_uv - 0.5;
    float dist = length(uv_centered);
    float vignette = smoothstep(pc.vignette_radius, pc.vignette_radius - pc.vignette_softness, dist);
    color *= vignette;

    out_color = vec4(color, 1.0);
}
