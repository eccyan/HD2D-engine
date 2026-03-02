#pragma once

#include "vulkan_game/engine/input_manager.hpp"
#include "vulkan_game/engine/renderer.hpp"
#include "vulkan_game/engine/scene.hpp"
#include "vulkan_game/engine/types.hpp"

namespace vulkan_game {

class App {
public:
    void run();

private:
    void init_window();
    void init_scene();
    void update_game();
    void main_loop();
    void cleanup();

    GLFWwindow* window_ = nullptr;
    Renderer renderer_;
    InputManager input_;
    Scene scene_;
    Entity* player_entity_ = nullptr;
};

}  // namespace vulkan_game
