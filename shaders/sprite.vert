#version 450

layout(location = 0) in vec3 in_position;
layout(location = 1) in vec2 in_uv;
layout(location = 2) in vec4 in_color;

layout(location = 0) out vec2 frag_uv;
layout(location = 1) out vec4 frag_color;

layout(set = 0, binding = 0) uniform UniformBufferObject {
    mat4 vp;
} ubo;

void main() {
    gl_Position = ubo.vp * vec4(in_position, 1.0);
    frag_uv = in_uv;
    frag_color = in_color;
}
