#version 450

layout(location = 0) in vec2 frag_uv;
layout(location = 0) out vec4 out_color;

layout(set = 0, binding = 0) uniform sampler2D source_tex;

layout(push_constant) uniform PushConstants {
    vec2 direction;  // (1,0) for horizontal, (0,1) for vertical
    vec2 texel_size;
} pc;

void main() {
    // 9-tap Gaussian blur (sigma ~4, normalized weights)
    const float weights[5] = float[](
        0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216
    );

    vec3 result = texture(source_tex, frag_uv).rgb * weights[0];
    vec2 step = pc.direction * pc.texel_size;

    for (int i = 1; i < 5; i++) {
        vec2 offset = step * float(i);
        result += texture(source_tex, frag_uv + offset).rgb * weights[i];
        result += texture(source_tex, frag_uv - offset).rgb * weights[i];
    }

    out_color = vec4(result, 1.0);
}
