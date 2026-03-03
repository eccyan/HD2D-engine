#pragma once

#include "vulkan_game/engine/sprite_batch.hpp"

#include <glm/glm.hpp>

namespace vulkan_game {

struct ParallaxLayer {
    float z = 5.0f;
    float parallax_factor = 0.0f;
    float quad_width = 40.0f;
    float quad_height = 25.0f;
    float uv_repeat_x = 1.0f;
    float uv_repeat_y = 1.0f;
    glm::vec4 tint{1.0f};

    SpriteDrawInfo generate_draw_info(glm::vec2 camera_target_xy) const;
};

}  // namespace vulkan_game
