#include "vulkan_game/engine/scene.hpp"

namespace vulkan_game {

void Scene::set_tile_layer(TileLayer layer) {
    if (!layer.tiles.empty()) {
        tile_layer_ = std::move(layer);
    } else {
        tile_layer_.reset();
    }
}

}  // namespace vulkan_game
