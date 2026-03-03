#pragma once

#include <nlohmann/json.hpp>
#include <string>
#include <vector>

namespace vulkan_game {

class ControlServer {
public:
    ~ControlServer();

    bool start(const std::string& socket_path = "/tmp/vulkan_game.sock");
    void stop();
    bool has_client() const { return client_fd_ >= 0; }

    // Called each frame — non-blocking accept + read.
    // Returns parsed JSON command objects (empty if none).
    std::vector<nlohmann::json> poll();

    // Send JSON line to connected client.
    void send(const nlohmann::json& msg);

private:
    int server_fd_ = -1;
    int client_fd_ = -1;
    std::string socket_path_;
    std::string read_buffer_;

    void try_accept();
    void disconnect_client();
};

}  // namespace vulkan_game
