#include "vulkan_game/engine/game_state.hpp"

namespace vulkan_game {

void GameStateStack::push(std::unique_ptr<GameState> state, App& app) {
    state->on_enter(app);
    stack_.push_back(std::move(state));
}

void GameStateStack::pop(App& app) {
    if (stack_.empty()) return;
    stack_.back()->on_exit(app);
    stack_.pop_back();
}

void GameStateStack::replace(std::unique_ptr<GameState> state, App& app) {
    if (!stack_.empty()) {
        stack_.back()->on_exit(app);
        stack_.pop_back();
    }
    state->on_enter(app);
    stack_.push_back(std::move(state));
}

void GameStateStack::update(App& app, float dt) {
    if (stack_.empty()) return;

    // Find the lowest non-overlay state
    int base = static_cast<int>(stack_.size()) - 1;
    while (base > 0 && stack_[base]->is_overlay()) {
        base--;
    }

    // Update from base through top (base state + all overlays above it)
    for (size_t i = static_cast<size_t>(base); i < stack_.size(); i++) {
        stack_[i]->update(app, dt);
    }
}

void GameStateStack::build_draw_lists(App& app) {
    if (stack_.empty()) return;

    int base = static_cast<int>(stack_.size()) - 1;
    while (base > 0 && stack_[base]->is_overlay()) {
        base--;
    }

    for (size_t i = static_cast<size_t>(base); i < stack_.size(); i++) {
        stack_[i]->build_draw_lists(app);
    }
}

GameState* GameStateStack::top() const {
    return stack_.empty() ? nullptr : stack_.back().get();
}

}  // namespace vulkan_game
