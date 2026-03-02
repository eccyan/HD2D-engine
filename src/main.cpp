#include "vulkan_game/app.hpp"

#include <cstdlib>
#include <iostream>

int main() {
    vulkan_game::App app;

    try {
        app.run();
    } catch (const std::exception& e) {
        std::cerr << "Fatal error: " << e.what() << '\n';
        return EXIT_FAILURE;
    }

    return EXIT_SUCCESS;
}
