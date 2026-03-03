#include "vulkan_game/engine/parallax_layer.hpp"

namespace vulkan_game {

SpriteDrawInfo ParallaxLayer::generate_draw_info(glm::vec2 camera_target_xy) const {
    SpriteDrawInfo info{};

    // Quad always centered on camera target so it covers the viewport
    info.position = {camera_target_xy.x, camera_target_xy.y, z};
    info.size = {quad_width, quad_height};
    info.color = tint;

    // UV scrolling creates the parallax effect:
    // (1 - parallax_factor) controls how much the texture "lags behind" the camera.
    // parallax_factor=0 -> UV scrolls at full camera speed (distant, appears world-fixed)
    // parallax_factor=1 -> UV doesn't scroll (moves with camera, like foreground)
    float scroll_x = camera_target_xy.x * (1.0f - parallax_factor) / quad_width;
    float scroll_y = camera_target_xy.y * (1.0f - parallax_factor) / quad_height;

    info.uv_min = {scroll_x * uv_repeat_x, scroll_y * uv_repeat_y};
    info.uv_max = {(scroll_x + 1.0f) * uv_repeat_x, (scroll_y + 1.0f) * uv_repeat_y};

    return info;
}

}  // namespace vulkan_game
