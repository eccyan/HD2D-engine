#include "vulkan_game/game/states/gameplay_state.hpp"
#include "vulkan_game/app.hpp"
#include "vulkan_game/game/states/pause_state.hpp"

#define GLFW_INCLUDE_VULKAN
#include <GLFW/glfw3.h>

namespace vulkan_game {

void GameplayState::on_enter(App& app) {
    app.init_scene();
}

void GameplayState::on_exit(App& /*app*/) {
}

void GameplayState::update(App& app, float dt) {
    // Escape toggles pause overlay (instead of quitting)
    if (app.input().was_key_pressed(GLFW_KEY_ESCAPE)) {
        app.state_stack().push(std::make_unique<PauseState>(), app);
        return;
    }

    app.update_game(dt);
}

void GameplayState::build_draw_lists(App& /*app*/) {
    // update_game already builds entity_sprites_, overlay_sprites_, ui_sprites_
}

}  // namespace vulkan_game
