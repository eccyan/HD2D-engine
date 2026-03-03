#version 450

layout(location = 0) out vec2 frag_uv;

void main() {
    // Fullscreen triangle from gl_VertexIndex (no vertex buffer needed)
    // Vertices: (-1,-1), (3,-1), (-1,3) — covers entire screen
    frag_uv = vec2((gl_VertexIndex << 1) & 2, gl_VertexIndex & 2);
    gl_Position = vec4(frag_uv * 2.0 - 1.0, 0.0, 1.0);
}
