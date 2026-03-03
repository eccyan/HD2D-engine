#pragma once

#include "vulkan_game/engine/animation_state_machine.hpp"
#include "vulkan_game/engine/direction.hpp"
#include "vulkan_game/engine/ecs/types.hpp"

#include <glm/glm.hpp>

#include <string>

namespace vulkan_game::ecs {

struct PlayerTag {};

struct Facing {
    Direction dir = Direction::Down;
};

struct Animation {
    AnimationStateMachine state_machine;
};

struct NpcPatrol {
    Direction dir = Direction::Right;
    Direction reverse_dir = Direction::Left;
    float timer = 0.0f;
    float interval = 2.0f;
    float speed = 1.5f;
};

struct DialogRef {
    size_t dialog_index = 0;
};

struct DynamicLight {
    glm::vec4 color{1.0f, 1.0f, 1.0f, 0.8f};
    float radius = 3.0f;
};

struct ParticleEmitterRef {
    size_t emitter_id = 0;
};

struct FootstepEmitterRef {
    size_t emitter_id = 0;
};

struct ScriptRef {
    std::string module_name;
    std::string class_name;
};

}  // namespace vulkan_game::ecs
