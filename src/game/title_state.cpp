#include "vulkan_game/game/states/title_state.hpp"
#include "vulkan_game/game/states/gameplay_state.hpp"
#include "vulkan_game/app.hpp"

#define GLFW_INCLUDE_VULKAN
#include <GLFW/glfw3.h>

namespace vulkan_game {

void TitleState::on_enter(App& /*app*/) {
    blink_timer_ = 0.0f;
    show_prompt_ = true;
}

void TitleState::update(App& app, float dt) {
    // Blink the prompt
    blink_timer_ += dt;
    if (blink_timer_ >= 0.5f) {
        blink_timer_ -= 0.5f;
        show_prompt_ = !show_prompt_;
    }

    // Enter starts the game
    if (app.input().was_key_pressed(GLFW_KEY_ENTER) ||
        app.input().was_key_pressed(GLFW_KEY_SPACE)) {
        app.state_stack().replace(std::make_unique<GameplayState>(), app);
    }
}

void TitleState::build_draw_lists(App& app) {
    auto& ui = app.ui_sprites();
    auto& text = app.text_renderer();

    // Title text
    auto title = text.render_text(
        "HD-2D Vulkan Game",
        400.0f, 250.0f, 0.0f, 1.2f, {1.0f, 0.9f, 0.3f, 1.0f});
    ui.insert(ui.end(), title.begin(), title.end());

    // Blinking "Press Enter" prompt
    if (show_prompt_) {
        auto prompt = text.render_text(
            "Press Enter",
            520.0f, 400.0f, 0.0f, 0.7f, {0.8f, 0.8f, 0.8f, 1.0f});
        ui.insert(ui.end(), prompt.begin(), prompt.end());
    }
}

}  // namespace vulkan_game
