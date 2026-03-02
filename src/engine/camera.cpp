#include "vulkan_game/engine/camera.hpp"

#include <cmath>

#include <glm/gtc/matrix_transform.hpp>

namespace vulkan_game {

Camera::Camera()
    : position_(0.0f, 5.0f, 5.0f),
      target_(0.0f, 0.0f, 0.0f),
      up_(0.0f, 1.0f, 0.0f),
      fov_(45.0f),
      aspect_(16.0f / 9.0f),
      near_(0.1f),
      far_(100.0f) {}

void Camera::set_perspective(float fov_degrees, float aspect, float near_plane, float far_plane) {
    fov_ = fov_degrees;
    aspect_ = aspect;
    near_ = near_plane;
    far_ = far_plane;
}

void Camera::set_position(glm::vec3 position) {
    position_ = position;
}

void Camera::set_target(glm::vec3 target) {
    target_ = target;
}

void Camera::configure_hd2d(float aspect) {
    // 35° elevation, dist=12
    // sin(35°) ≈ 0.574 → y offset = 6.88
    // cos(35°) ≈ 0.819 → z offset = 9.83
    constexpr float kDist = 12.0f;
    constexpr float kElevDeg = 35.0f;
    const float elev_rad = glm::radians(kElevDeg);
    const float y_off = std::sin(elev_rad) * kDist;
    const float z_off = std::cos(elev_rad) * kDist;

    // Camera offset relative to target
    glm::vec3 offset(0.0f, y_off, z_off);
    target_ = glm::vec3(0.0f);
    position_ = target_ + offset;

    set_perspective(45.0f, aspect, 0.1f, 100.0f);
}

void Camera::set_follow_target(glm::vec3 target) {
    follow_target_ = target;
    has_follow_target_ = true;
}

void Camera::set_follow_speed(float speed) {
    follow_speed_ = speed;
}

void Camera::update(float dt) {
    if (!has_follow_target_) return;

    // Compute current offset (camera pos relative to look target)
    glm::vec3 offset = position_ - target_;

    // Lerp target_ toward follow_target_ (frame-rate independent)
    float t = 1.0f - std::exp(-follow_speed_ * dt);
    target_ = glm::mix(target_, follow_target_, t);
    position_ = target_ + offset;
}

glm::mat4 Camera::view() const {
    return glm::lookAt(position_, target_, up_);
}

glm::mat4 Camera::projection() const {
    return glm::perspective(glm::radians(fov_), aspect_, near_, far_);
}

glm::mat4 Camera::view_projection() const {
    return projection() * view();
}

}  // namespace vulkan_game
