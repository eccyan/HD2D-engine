#include "vulkan_game/engine/input_manager.hpp"

#define GLFW_INCLUDE_VULKAN
#include <GLFW/glfw3.h>

namespace vulkan_game {

void InputManager::update() {
    if (!window_) return;
    previous_ = current_;
    for (int key = 0; key < kKeyCount; key++) {
        current_[key] = (glfwGetKey(window_, key) == GLFW_PRESS)
                      || injected_[key]
                      || inject_once_[key];
    }
    inject_once_.fill(false);
}

bool InputManager::is_key_down(int glfw_key) const {
    if (glfw_key < 0 || glfw_key >= kKeyCount) return false;
    return current_[glfw_key];
}

bool InputManager::was_key_pressed(int glfw_key) const {
    if (glfw_key < 0 || glfw_key >= kKeyCount) return false;
    return current_[glfw_key] && !previous_[glfw_key];
}

void InputManager::inject_key(int glfw_key, bool down) {
    if (glfw_key >= 0 && glfw_key < kKeyCount)
        injected_[glfw_key] = down;
}

void InputManager::inject_key_once(int glfw_key) {
    if (glfw_key >= 0 && glfw_key < kKeyCount)
        inject_once_[glfw_key] = true;
}

void InputManager::clear_injections() {
    injected_.fill(false);
    inject_once_.fill(false);
}

}  // namespace vulkan_game
