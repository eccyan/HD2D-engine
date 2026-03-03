#pragma once

#include "vulkan_game/engine/game_state.hpp"

namespace vulkan_game {

class GameplayState : public GameState {
public:
    void on_enter(App& app) override;
    void on_exit(App& app) override;
    void update(App& app, float dt) override;
    void build_draw_lists(App& app) override;
};

}  // namespace vulkan_game
