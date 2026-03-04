#pragma once

#include "vulkan_game/engine/direction.hpp"
#include "vulkan_game/engine/game_state.hpp"

#include <glm/glm.hpp>

#include <string>

namespace vulkan_game {

class TransitionState : public GameState {
public:
    TransitionState(std::string target_scene, glm::vec3 spawn_pos, Direction facing);

    void on_enter(App& app) override;
    void on_exit(App& app) override;
    void update(App& app, float dt) override;
    void build_draw_lists(App& app) override;
    bool is_overlay() const override { return true; }

private:
    enum Phase { FadeOut, Load, FadeIn, Done };
    Phase phase_ = FadeOut;
    float fade_ = 0.0f;
    static constexpr float kFadeSpeed = 2.0f;  // 0.5s per fade

    std::string target_scene_;
    glm::vec3 spawn_position_;
    Direction spawn_facing_;
};

}  // namespace vulkan_game
