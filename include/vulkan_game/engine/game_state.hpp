#pragma once

#include <memory>
#include <vector>

namespace vulkan_game {

class App;

class GameState {
public:
    virtual ~GameState() = default;

    virtual void on_enter(App& app) { (void)app; }
    virtual void on_exit(App& app) { (void)app; }
    virtual void update(App& app, float dt) = 0;
    virtual void build_draw_lists(App& app) { (void)app; }
    virtual bool is_overlay() const { return false; }
};

class GameStateStack {
public:
    void push(std::unique_ptr<GameState> state, App& app);
    void pop(App& app);
    void replace(std::unique_ptr<GameState> state, App& app);

    void update(App& app, float dt);
    void build_draw_lists(App& app);

    bool empty() const { return stack_.empty(); }
    GameState* top() const;

private:
    std::vector<std::unique_ptr<GameState>> stack_;
};

}  // namespace vulkan_game
