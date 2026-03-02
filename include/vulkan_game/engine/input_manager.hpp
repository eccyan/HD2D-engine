#pragma once

struct GLFWwindow;

namespace vulkan_game {

class InputManager {
public:
    void set_window(GLFWwindow* window) { window_ = window; }

    bool is_key_down(int glfw_key) const;

private:
    GLFWwindow* window_ = nullptr;
};

}  // namespace vulkan_game
