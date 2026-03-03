#include "vulkan_game/engine/resource_manager.hpp"

namespace vulkan_game {

void ResourceManager::init(VkDevice device, VmaAllocator allocator,
                            VkCommandPool cmd_pool, VkQueue queue) {
    device_ = device;
    allocator_ = allocator;
    cmd_pool_ = cmd_pool;
    queue_ = queue;

    texture_cache_.set_loader([this](const std::string& path) -> std::shared_ptr<Texture> {
        auto tex = Texture::load_from_file(device_, allocator_, cmd_pool_, queue_, path);
        return std::make_shared<Texture>(std::move(tex));
    });
}

void ResourceManager::shutdown() {
    texture_cache_.clear();
    font_cache_.clear();
}

ResourceHandle<Texture> ResourceManager::load_texture(const std::string& path, VkFilter filter) {
    std::string key = path;
    if (filter == VK_FILTER_LINEAR) {
        key += ":linear";
    }
    if (texture_cache_.contains(key)) {
        return texture_cache_.get(key);
    }
    // File-based textures always use NEAREST via the default loader
    // For LINEAR filter, we need custom loading but currently all file textures are NEAREST
    return texture_cache_.get(key);
}

ResourceHandle<Texture> ResourceManager::load_texture_from_memory(
    const std::string& key, const uint8_t* pixels,
    uint32_t width, uint32_t height, VkFilter filter) {
    if (texture_cache_.contains(key)) {
        return texture_cache_.get(key);
    }
    auto tex = Texture::load_from_memory(device_, allocator_, cmd_pool_, queue_,
                                         pixels, width, height, filter);
    return texture_cache_.insert(key, std::make_shared<Texture>(std::move(tex)));
}

ResourceHandle<FontAtlas> ResourceManager::load_font(
    const std::string& path, float size,
    const std::vector<uint32_t>& codepoints) {
    std::string key = path + ":" + std::to_string(static_cast<int>(size));
    if (font_cache_.contains(key)) {
        return font_cache_.get(key);
    }
    auto atlas = std::make_shared<FontAtlas>();
    atlas->init(path, size, codepoints);
    return font_cache_.insert(key, std::move(atlas));
}

}  // namespace vulkan_game
