#pragma once

#include <array>

struct GLFWwindow;

// GLFW_KEY_LAST is 348
constexpr int kKeyCount = 349;

namespace vulkan_game {

class InputManager {
public:
    void set_window(GLFWwindow* window) { window_ = window; }
    void update();
    bool is_key_down(int glfw_key) const;
    bool was_key_pressed(int glfw_key) const;

    // External injection (for ControlServer / AI agent)
    void inject_key(int glfw_key, bool down);   // persistent hold (WASD, Shift)
    void inject_key_once(int glfw_key);          // single-frame pulse (E)
    void clear_injections();

private:
    GLFWwindow* window_ = nullptr;
    std::array<bool, kKeyCount> current_{};
    std::array<bool, kKeyCount> previous_{};
    std::array<bool, kKeyCount> injected_{};     // persistent key state
    std::array<bool, kKeyCount> inject_once_{};  // single-frame pulse
};

}  // namespace vulkan_game
