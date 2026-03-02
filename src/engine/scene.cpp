#include "vulkan_game/engine/scene.hpp"

#include <memory>

namespace vulkan_game {

Entity* Scene::create_entity() {
    entities_.push_back(std::make_unique<Entity>());
    return entities_.back().get();
}

}  // namespace vulkan_game
