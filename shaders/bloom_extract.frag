#version 450

layout(location = 0) in vec2 frag_uv;
layout(location = 0) out vec4 out_color;

layout(set = 0, binding = 0) uniform sampler2D scene_tex;

layout(push_constant) uniform PushConstants {
    float threshold;
    float soft_knee;
    vec2 texel_size;
} pc;

void main() {
    // 4-tap box downsample (bilinear-filtered for 16-tap effective)
    vec2 uv = frag_uv;
    vec3 c0 = texture(scene_tex, uv + vec2(-1.0, -1.0) * pc.texel_size).rgb;
    vec3 c1 = texture(scene_tex, uv + vec2( 1.0, -1.0) * pc.texel_size).rgb;
    vec3 c2 = texture(scene_tex, uv + vec2(-1.0,  1.0) * pc.texel_size).rgb;
    vec3 c3 = texture(scene_tex, uv + vec2( 1.0,  1.0) * pc.texel_size).rgb;
    vec3 color = (c0 + c1 + c2 + c3) * 0.25;

    // Soft brightness threshold (smooth knee)
    float brightness = max(color.r, max(color.g, color.b));
    float knee = pc.threshold * pc.soft_knee;
    float soft = brightness - pc.threshold + knee;
    soft = clamp(soft, 0.0, 2.0 * knee);
    soft = soft * soft / (4.0 * knee + 0.00001);
    float contribution = max(soft, brightness - pc.threshold);
    contribution /= max(brightness, 0.00001);

    out_color = vec4(color * contribution, 1.0);
}
