#pragma once

#include "vulkan_game/engine/parallax_layer.hpp"
#include "vulkan_game/engine/tilemap.hpp"
#include "vulkan_game/engine/types.hpp"

#include <glm/glm.hpp>
#include <optional>
#include <vector>

namespace vulkan_game {

class Scene {
public:
    void set_tile_layer(TileLayer layer);
    const std::optional<TileLayer>& tile_layer() const { return tile_layer_; }

    void set_ambient_color(const glm::vec4& color) { ambient_color_ = color; }
    const glm::vec4& ambient_color() const { return ambient_color_; }

    void add_light(const PointLight& light) { lights_.push_back(light); }
    void clear_lights() { lights_.clear(); }
    const std::vector<PointLight>& lights() const { return lights_; }

    void set_background_layers(std::vector<ParallaxLayer> layers) { background_layers_ = std::move(layers); }
    const std::vector<ParallaxLayer>& background_layers() const { return background_layers_; }

private:
    std::optional<TileLayer> tile_layer_;
    glm::vec4 ambient_color_{0.25f, 0.28f, 0.45f, 1.0f};
    std::vector<PointLight> lights_;
    std::vector<ParallaxLayer> background_layers_;
};

}  // namespace vulkan_game
