#include "vulkan_game/engine/input_manager.hpp"

#define GLFW_INCLUDE_VULKAN
#include <GLFW/glfw3.h>

namespace vulkan_game {

bool InputManager::is_key_down(int glfw_key) const {
    if (!window_) return false;
    return glfwGetKey(window_, glfw_key) == GLFW_PRESS;
}

}  // namespace vulkan_game
