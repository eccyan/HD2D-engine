#include "vulkan_game/game/states/pause_state.hpp"
#include "vulkan_game/app.hpp"

#define GLFW_INCLUDE_VULKAN
#include <GLFW/glfw3.h>

namespace vulkan_game {

void PauseState::on_enter(App& /*app*/) {
    selected_item_ = 0;
}

void PauseState::update(App& app, float dt) {
    (void)dt;

    // Escape or Resume selection → unpause
    if (app.input().was_key_pressed(GLFW_KEY_ESCAPE)) {
        app.state_stack().pop(app);
        return;
    }

    // Navigate menu
    if (app.input().was_key_pressed(GLFW_KEY_W) ||
        app.input().was_key_pressed(GLFW_KEY_UP)) {
        selected_item_ = (selected_item_ + 1) % 2;
    }
    if (app.input().was_key_pressed(GLFW_KEY_S) ||
        app.input().was_key_pressed(GLFW_KEY_DOWN)) {
        selected_item_ = (selected_item_ + 1) % 2;
    }

    // Confirm selection
    if (app.input().was_key_pressed(GLFW_KEY_ENTER) ||
        app.input().was_key_pressed(GLFW_KEY_SPACE)) {
        if (selected_item_ == 0) {
            // Resume
            app.state_stack().pop(app);
        } else {
            // Quit
            glfwSetWindowShouldClose(app.window(), GLFW_TRUE);
        }
    }
}

void PauseState::build_draw_lists(App& app) {
    auto& ui = app.ui_sprites();
    auto& text = app.text_renderer();
    auto& atlas = app.font_atlas();

    // Semi-transparent overlay background
    SpriteDrawInfo bg{};
    bg.position = {640.0f, 360.0f, 0.1f};
    bg.size = {1280.0f, 720.0f};
    bg.color = {0.0f, 0.0f, 0.0f, 0.6f};
    const GlyphInfo* dot_glyph = atlas.glyph('.');
    if (dot_glyph && dot_glyph->size.x > 0) {
        glm::vec2 center = (dot_glyph->uv_min + dot_glyph->uv_max) * 0.5f;
        bg.uv_min = center;
        bg.uv_max = center;
    }
    ui.push_back(bg);

    // "PAUSED" title
    auto title = text.render_text(
        "PAUSED", 560.0f, 250.0f, 0.0f, 1.0f, {1.0f, 1.0f, 1.0f, 1.0f});
    ui.insert(ui.end(), title.begin(), title.end());

    // Menu items
    const char* items[] = {"Resume", "Quit"};
    for (int i = 0; i < 2; i++) {
        glm::vec4 color = (i == selected_item_)
            ? glm::vec4{1.0f, 0.9f, 0.3f, 1.0f}
            : glm::vec4{0.7f, 0.7f, 0.7f, 1.0f};
        float y = 350.0f + static_cast<float>(i) * 50.0f;
        std::string label = (i == selected_item_) ? "> " + std::string(items[i]) : std::string(items[i]);
        auto item_sprites = text.render_text(label, 570.0f, y, 0.0f, 0.7f, color);
        ui.insert(ui.end(), item_sprites.begin(), item_sprites.end());
    }
}

}  // namespace vulkan_game
