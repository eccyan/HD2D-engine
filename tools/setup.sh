#!/usr/bin/env bash
# =============================================================================
# vulkan-game-tools Setup Script
# =============================================================================
# Installs dependencies, detects AI providers, and creates .env configuration.
# Usage: cd tools && ./setup.sh
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ---------------------------------------------------------------------------
# Colors & helpers
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m' # No Color

info()    { echo -e "${BLUE}[info]${NC}  $*"; }
success() { echo -e "${GREEN}[ok]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[warn]${NC}  $*"; }
error()   { echo -e "${RED}[err]${NC}   $*"; }
header()  { echo -e "\n${BOLD}${CYAN}==> $*${NC}"; }
dim()     { echo -e "${DIM}    $*${NC}"; }

# ---------------------------------------------------------------------------
# 1. Check prerequisites
# ---------------------------------------------------------------------------
header "Checking prerequisites"

# Node.js
if command -v node &>/dev/null; then
  NODE_VER=$(node --version)
  success "Node.js $NODE_VER"
  # Check minimum version (18+)
  MAJOR=$(echo "$NODE_VER" | sed 's/v//' | cut -d. -f1)
  if [ "$MAJOR" -lt 18 ]; then
    warn "Node.js 18+ recommended. You have $NODE_VER"
  fi
else
  error "Node.js not found. Install from https://nodejs.org/ (v18+)"
  exit 1
fi

# pnpm
if command -v pnpm &>/dev/null; then
  PNPM_VER=$(pnpm --version)
  success "pnpm $PNPM_VER"
else
  warn "pnpm not found. Installing via corepack..."
  if command -v corepack &>/dev/null; then
    corepack enable
    corepack prepare pnpm@latest --activate
    success "pnpm installed via corepack"
  else
    warn "corepack not available. Installing pnpm via npm..."
    npm install -g pnpm
    success "pnpm installed via npm"
  fi
fi

# ---------------------------------------------------------------------------
# 2. Install dependencies
# ---------------------------------------------------------------------------
header "Installing dependencies"

pnpm install
success "pnpm install complete"

# ---------------------------------------------------------------------------
# 3. Build bridge (required for engine communication)
# ---------------------------------------------------------------------------
header "Building bridge proxy"

(cd apps/bridge && pnpm build)
success "Bridge built"

# ---------------------------------------------------------------------------
# 4. Detect & configure AI providers
# ---------------------------------------------------------------------------
header "Detecting AI providers"

OLLAMA_URL="http://localhost:11434"
OLLAMA_MODEL="llama3"
SD_WEBUI_URL="http://localhost:7860"
STABLE_AUDIO_URL="http://localhost:8001"

OLLAMA_OK=false
SD_WEBUI_OK=false
STABLE_AUDIO_OK=false

# --- Ollama ------------------------------------------------------------------
check_ollama() {
  if curl -sf "${OLLAMA_URL}/api/tags" -o /dev/null --connect-timeout 2; then
    return 0
  fi
  return 1
}

if command -v ollama &>/dev/null; then
  success "Ollama CLI found: $(command -v ollama)"

  if check_ollama; then
    OLLAMA_OK=true
    success "Ollama server is running at $OLLAMA_URL"

    # Check if model is available
    MODELS=$(curl -sf "${OLLAMA_URL}/api/tags" 2>/dev/null | grep -o '"name":"[^"]*"' | sed 's/"name":"//;s/"//' || true)
    if [ -n "$MODELS" ]; then
      dim "Available models: $(echo "$MODELS" | tr '\n' ', ' | sed 's/,$//')"

      # Check for default model
      if echo "$MODELS" | grep -q "^${OLLAMA_MODEL}"; then
        success "Default model '${OLLAMA_MODEL}' is available"
      else
        warn "Default model '${OLLAMA_MODEL}' not found"
        # Pick first available or ask to pull
        FIRST_MODEL=$(echo "$MODELS" | head -1 | cut -d: -f1)
        if [ -n "$FIRST_MODEL" ]; then
          echo -e "    Available: $MODELS"
          read -rp "    Use '$FIRST_MODEL' instead? (Y/n) " USE_FIRST
          if [[ "${USE_FIRST:-y}" =~ ^[Yy]$ ]]; then
            OLLAMA_MODEL="$FIRST_MODEL"
            success "Using model: $OLLAMA_MODEL"
          fi
        fi

        read -rp "    Pull '${OLLAMA_MODEL}' now? (Y/n) " PULL_MODEL
        if [[ "${PULL_MODEL:-y}" =~ ^[Yy]$ ]]; then
          info "Pulling ${OLLAMA_MODEL}... (this may take a while)"
          ollama pull "$OLLAMA_MODEL"
          success "Model ${OLLAMA_MODEL} pulled"
        fi
      fi
    else
      warn "No models found. Pull one with: ollama pull llama3"
      read -rp "    Pull 'llama3' now? (Y/n) " PULL_NOW
      if [[ "${PULL_NOW:-y}" =~ ^[Yy]$ ]]; then
        info "Pulling llama3... (this may take a while)"
        ollama pull llama3
        success "Model llama3 pulled"
      fi
    fi
  else
    warn "Ollama installed but server not running"
    read -rp "    Start Ollama server now? (Y/n) " START_OLLAMA
    if [[ "${START_OLLAMA:-y}" =~ ^[Yy]$ ]]; then
      info "Starting Ollama server in background..."
      ollama serve &>/dev/null &
      sleep 2
      if check_ollama; then
        OLLAMA_OK=true
        success "Ollama server started"

        # Check/pull model
        if ! curl -sf "${OLLAMA_URL}/api/tags" 2>/dev/null | grep -q "\"${OLLAMA_MODEL}\""; then
          read -rp "    Pull '${OLLAMA_MODEL}' now? (Y/n) " PULL_NOW
          if [[ "${PULL_NOW:-y}" =~ ^[Yy]$ ]]; then
            ollama pull "$OLLAMA_MODEL"
            success "Model pulled"
          fi
        fi
      else
        warn "Failed to start Ollama server"
      fi
    fi
  fi
else
  warn "Ollama not installed"
  echo ""
  echo -e "    ${BOLD}Ollama${NC} provides local LLM for Level Designer, Keyframe Animator,"
  echo -e "    and Particle Designer AI features."
  echo ""

  if [[ "$OSTYPE" == "darwin"* ]]; then
    echo -e "    Install options:"
    echo -e "      ${CYAN}brew install ollama${NC}"
    echo -e "      ${CYAN}curl -fsSL https://ollama.com/install.sh | sh${NC}"
    echo ""
    if command -v brew &>/dev/null; then
      read -rp "    Install Ollama via Homebrew? (Y/n) " INSTALL_OLLAMA
      if [[ "${INSTALL_OLLAMA:-y}" =~ ^[Yy]$ ]]; then
        brew install ollama
        success "Ollama installed"
        info "Starting Ollama server..."
        ollama serve &>/dev/null &
        sleep 3
        if check_ollama; then
          OLLAMA_OK=true
          success "Ollama server running"
          read -rp "    Pull 'llama3' model? (Y/n) " PULL_NOW
          if [[ "${PULL_NOW:-y}" =~ ^[Yy]$ ]]; then
            ollama pull llama3
            success "Model pulled"
          fi
        fi
      fi
    fi
  elif [[ "$OSTYPE" == "linux"* ]]; then
    echo -e "    Install: ${CYAN}curl -fsSL https://ollama.com/install.sh | sh${NC}"
    read -rp "    Install Ollama now? (Y/n) " INSTALL_OLLAMA
    if [[ "${INSTALL_OLLAMA:-y}" =~ ^[Yy]$ ]]; then
      curl -fsSL https://ollama.com/install.sh | sh
      success "Ollama installed"
      ollama serve &>/dev/null &
      sleep 3
      if check_ollama; then
        OLLAMA_OK=true
        read -rp "    Pull 'llama3' model? (Y/n) " PULL_NOW
        if [[ "${PULL_NOW:-y}" =~ ^[Yy]$ ]]; then
          ollama pull llama3
          success "Model pulled"
        fi
      fi
    fi
  fi
fi

echo ""

# --- SD WebUI Forge ----------------------------------------------------------
FORGE_DEFAULT_DIR="${HOME}/stable-diffusion-webui-forge"

check_forge() {
  if curl -sf "${SD_WEBUI_URL}/sdapi/v1/sd-models" -o /dev/null --connect-timeout 3; then
    return 0
  fi
  return 1
}

# Find Forge installation directory
find_forge_dir() {
  for candidate in \
    "${FORGE_DIR:-}" \
    "${HOME}/stable-diffusion-webui-forge" \
    "${HOME}/.local/share/stable-diffusion-webui-forge" \
    "/opt/stable-diffusion-webui-forge"; do
    if [ -n "$candidate" ] && [ -f "${candidate}/webui.sh" ]; then
      echo "$candidate"
      return 0
    fi
  done
  return 1
}

start_forge() {
  local dir="$1"
  info "Starting Forge in background (this may take a minute)..."
  (cd "$dir" && nohup ./webui.sh --api --listen --skip-torch-cuda-test &>/dev/null &)
  # Poll for startup — Forge takes a while
  local attempts=0
  while [ $attempts -lt 30 ]; do
    sleep 3
    if check_forge; then
      return 0
    fi
    attempts=$((attempts + 1))
    echo -ne "    Waiting for Forge to start... (${attempts}/30)\r"
  done
  echo ""
  return 1
}

if check_forge; then
  SD_WEBUI_OK=true
  success "Forge is running at $SD_WEBUI_URL"
else
  FOUND_FORGE_DIR=$(find_forge_dir 2>/dev/null || true)

  if [ -n "$FOUND_FORGE_DIR" ]; then
    success "Forge installation found at $FOUND_FORGE_DIR"

    read -rp "    Start Forge now? (Y/n) " START_FORGE
    if [[ "${START_FORGE:-y}" =~ ^[Yy]$ ]]; then
      if start_forge "$FOUND_FORGE_DIR"; then
        SD_WEBUI_OK=true
        success "Forge is running at $SD_WEBUI_URL"
      else
        warn "Forge did not start in time. Start manually:"
        dim "cd $FOUND_FORGE_DIR && ./webui.sh --api"
      fi
    fi
  else
    warn "Forge not installed"
    echo ""
    echo -e "    ${BOLD}SD WebUI Forge${NC} provides Stable Diffusion for Pixel Painter"
    echo -e "    AI pixel art generation. Uses SD 1.5 models (<4GB)."
    echo ""

    # Check prerequisites
    HAS_GIT=false
    HAS_PYTHON3=false
    if command -v git &>/dev/null; then HAS_GIT=true; fi
    if command -v python3 &>/dev/null; then HAS_PYTHON3=true; fi

    if ! $HAS_GIT; then
      warn "git is required to install Forge"
      dim "Install git first, then re-run this script."
    elif ! $HAS_PYTHON3; then
      warn "python3 is required to install Forge"
      dim "Install Python 3.10+ first, then re-run this script."
    else
      PY_VER=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")' 2>/dev/null || echo "0.0")
      dim "Found: git, python3 ($PY_VER)"
      echo ""
      echo -e "    Install location: ${CYAN}${FORGE_DEFAULT_DIR}${NC}"
      echo -e "    ${DIM}First run will download dependencies + base model (~4GB total).${NC}"
      echo ""

      read -rp "    Clone and install Forge? (Y/n) " INSTALL_FORGE
      if [[ "${INSTALL_FORGE:-y}" =~ ^[Yy]$ ]]; then
        info "Cloning Forge..."
        git clone https://github.com/lllyasviel/stable-diffusion-webui-forge.git "$FORGE_DEFAULT_DIR"
        success "Forge cloned to $FORGE_DEFAULT_DIR"

        read -rp "    Start Forge now? First run downloads deps (~5-10min) (Y/n) " START_NOW
        if [[ "${START_NOW:-y}" =~ ^[Yy]$ ]]; then
          if start_forge "$FORGE_DEFAULT_DIR"; then
            SD_WEBUI_OK=true
            success "Forge is running at $SD_WEBUI_URL"
          else
            warn "Forge is still starting up. It may take longer on first run."
            dim "Check manually: cd $FORGE_DEFAULT_DIR && ./webui.sh --api"
          fi
        else
          dim "Start later with:"
          dim "  cd $FORGE_DEFAULT_DIR && ./webui.sh --api"
        fi
      fi
    fi

    if ! $SD_WEBUI_OK; then
      read -rp "    Enter custom Forge URL (or press Enter to skip): " CUSTOM_SD_WEBUI
      if [ -n "$CUSTOM_SD_WEBUI" ]; then
        SD_WEBUI_URL="$CUSTOM_SD_WEBUI"
        if check_forge; then
          SD_WEBUI_OK=true
          success "Forge found at $SD_WEBUI_URL"
        else
          warn "Forge not responding at $SD_WEBUI_URL (saved anyway)"
        fi
      fi
    fi
  fi
fi

echo ""

# --- Stable Audio Open Small --------------------------------------------------
STABLE_AUDIO_SERVER="${SCRIPT_DIR}/scripts/stable-audio-server.py"
STABLE_AUDIO_VENV="${SCRIPT_DIR}/.venv/stable-audio"
STABLE_AUDIO_PYTHON="python3"  # overridden if venv exists

check_stable_audio() {
  if curl -sf "${STABLE_AUDIO_URL}/health" -o /dev/null --connect-timeout 3; then
    return 0
  fi
  return 1
}

# Use venv python if the venv exists
activate_stable_audio_venv() {
  if [ -f "${STABLE_AUDIO_VENV}/bin/python" ]; then
    STABLE_AUDIO_PYTHON="${STABLE_AUDIO_VENV}/bin/python"
    return 0
  fi
  return 1
}

# Check if stable-audio-tools Python package is installed (in venv or system)
check_stable_audio_deps() {
  activate_stable_audio_venv 2>/dev/null || true
  "$STABLE_AUDIO_PYTHON" -c "import stable_audio_tools; import flask" &>/dev/null
}

start_stable_audio() {
  activate_stable_audio_venv 2>/dev/null || true
  info "Starting Stable Audio server in background..."
  info "First run will download the model from HuggingFace (~500MB)."
  nohup "$STABLE_AUDIO_PYTHON" "$STABLE_AUDIO_SERVER" --port 8001 &>/dev/null &
  # Poll for startup — model loading can take a while
  local attempts=0
  while [ $attempts -lt 40 ]; do
    sleep 3
    if check_stable_audio; then
      return 0
    fi
    attempts=$((attempts + 1))
    echo -ne "    Waiting for Stable Audio to start... (${attempts}/40)\r"
  done
  echo ""
  return 1
}

if check_stable_audio; then
  STABLE_AUDIO_OK=true
  success "Stable Audio is running at $STABLE_AUDIO_URL"
else
  if command -v python3 &>/dev/null; then
    PY_VER=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")' 2>/dev/null || echo "0.0")

    if check_stable_audio_deps; then
      success "Stable Audio dependencies installed (python3 $PY_VER)"

      read -rp "    Start Stable Audio server now? (Y/n) " START_SA
      if [[ "${START_SA:-y}" =~ ^[Yy]$ ]]; then
        if start_stable_audio; then
          STABLE_AUDIO_OK=true
          success "Stable Audio is running at $STABLE_AUDIO_URL"
        else
          warn "Stable Audio is still loading the model. It may take longer on first run."
          dim "Check manually: $STABLE_AUDIO_PYTHON $STABLE_AUDIO_SERVER"
        fi
      fi
    else
      warn "Stable Audio dependencies not installed"
      echo ""
      echo -e "    ${BOLD}Stable Audio Open Small${NC} provides music/SFX generation for"
      echo -e "    Audio Composer and SFX Designer. Max 11s, 44.1kHz stereo."
      echo ""

      dim "Found: python3 ($PY_VER)"
      echo ""
      echo -e "    Packages: ${CYAN}flask torch torchaudio einops stable-audio-tools${NC}"
      echo -e "    Installs into a venv at: ${CYAN}${STABLE_AUDIO_VENV}${NC}"
      echo -e "    ${DIM}First server run will download the model (~500MB).${NC}"
      echo ""

      read -rp "    Create venv and install Stable Audio dependencies? (Y/n) " INSTALL_SA
      if [[ "${INSTALL_SA:-y}" =~ ^[Yy]$ ]]; then
        info "Creating virtual environment at ${STABLE_AUDIO_VENV}..."
        mkdir -p "$(dirname "$STABLE_AUDIO_VENV")"
        python3 -m venv "$STABLE_AUDIO_VENV"
        STABLE_AUDIO_PYTHON="${STABLE_AUDIO_VENV}/bin/python"
        success "Virtual environment created"

        info "Installing Stable Audio dependencies (this may take a while)..."
        "$STABLE_AUDIO_PYTHON" -m pip install --upgrade pip
        "$STABLE_AUDIO_PYTHON" -m pip install flask torch torchaudio einops stable-audio-tools
        success "Stable Audio dependencies installed"

        read -rp "    Start Stable Audio server now? (Y/n) " START_SA_NOW
        if [[ "${START_SA_NOW:-y}" =~ ^[Yy]$ ]]; then
          if start_stable_audio; then
            STABLE_AUDIO_OK=true
            success "Stable Audio is running at $STABLE_AUDIO_URL"
          else
            warn "Stable Audio is still loading. Start manually later:"
            dim "  $STABLE_AUDIO_PYTHON $STABLE_AUDIO_SERVER"
          fi
        else
          dim "Start later with:"
          dim "  $STABLE_AUDIO_PYTHON $STABLE_AUDIO_SERVER"
        fi
      fi
    fi
  else
    warn "python3 not found"
    echo ""
    echo -e "    ${BOLD}Stable Audio Open Small${NC} provides music/SFX generation for"
    echo -e "    Audio Composer and SFX Designer."
    echo ""
    echo -e "    Requires Python 3.10+. Install Python first, then re-run this script."
  fi

  if ! $STABLE_AUDIO_OK; then
    read -rp "    Enter custom Stable Audio URL (or press Enter to skip): " CUSTOM_STABLE_AUDIO
    if [ -n "$CUSTOM_STABLE_AUDIO" ]; then
      STABLE_AUDIO_URL="$CUSTOM_STABLE_AUDIO"
      if check_stable_audio; then
        STABLE_AUDIO_OK=true
        success "Stable Audio found at $STABLE_AUDIO_URL"
      else
        warn "Stable Audio not responding at $STABLE_AUDIO_URL (saved anyway)"
      fi
    fi
  fi
fi

# ---------------------------------------------------------------------------
# 5. Write .env
# ---------------------------------------------------------------------------
header "Writing .env configuration"

ENV_FILE="$SCRIPT_DIR/.env"

cat > "$ENV_FILE" <<EOF
# =============================================================================
# vulkan-game-tools AI Provider Configuration
# Generated by setup.sh on $(date '+%Y-%m-%d %H:%M:%S')
# =============================================================================

# --- Ollama (LLM) -----------------------------------------------------------
# Used by: Level Designer, Keyframe Animator, Particle Designer
VITE_OLLAMA_URL=${OLLAMA_URL}
VITE_OLLAMA_MODEL=${OLLAMA_MODEL}

# --- SD WebUI Forge (Stable Diffusion) ---------------------------------------
# Used by: Pixel Painter
VITE_SD_WEBUI_URL=${SD_WEBUI_URL}

# --- Stable Audio Open Small (Music/SFX Generation) -------------------------
# Used by: Audio Composer, SFX Designer
VITE_STABLE_AUDIO_URL=${STABLE_AUDIO_URL}
EOF

success "Configuration written to tools/.env"

# ---------------------------------------------------------------------------
# 6. Summary
# ---------------------------------------------------------------------------
header "Setup complete!"

echo ""
echo -e "  ${BOLD}AI Provider Status:${NC}"
if $OLLAMA_OK; then
  echo -e "    ${GREEN}*${NC} Ollama      ${GREEN}ready${NC}  (model: ${OLLAMA_MODEL})"
else
  echo -e "    ${RED}*${NC} Ollama      ${DIM}not running${NC}  ${DIM}(Level Designer, Keyframe Animator, Particle Designer)${NC}"
fi
if $SD_WEBUI_OK; then
  echo -e "    ${GREEN}*${NC} Forge       ${GREEN}ready${NC}"
else
  echo -e "    ${RED}*${NC} Forge       ${DIM}not running${NC}  ${DIM}(Pixel Painter)${NC}"
fi
if $STABLE_AUDIO_OK; then
  echo -e "    ${GREEN}*${NC} Stable Audio ${GREEN}ready${NC}"
else
  echo -e "    ${RED}*${NC} Stable Audio ${DIM}not running${NC}  ${DIM}(Audio Composer, SFX Designer)${NC}"
fi

echo ""
echo -e "  ${BOLD}Quick Start:${NC}"
echo -e "    ${DIM}# Terminal 1: Start the game engine${NC}"
echo -e "    ${CYAN}cd build/macos-debug && ./vulkan_game${NC}"
echo ""
echo -e "    ${DIM}# Terminal 2: Start the bridge proxy${NC}"
echo -e "    ${CYAN}cd tools/apps/bridge && pnpm start${NC}"
echo ""
echo -e "    ${DIM}# Terminal 3: Start a tool (e.g. Level Designer)${NC}"
echo -e "    ${CYAN}cd tools/apps/level-designer && pnpm dev${NC}"
echo ""
echo -e "  ${BOLD}All tools:${NC}"
echo -e "    Level Designer       ${CYAN}http://localhost:5173${NC}  (Ollama)"
echo -e "    Pixel Painter        ${CYAN}http://localhost:5174${NC}  (Forge)"
echo -e "    Keyframe Animator    ${CYAN}http://localhost:5175${NC}  (Ollama)"
echo -e "    Particle Designer    ${CYAN}http://localhost:5176${NC}  (Ollama)"
echo -e "    Audio Composer       ${CYAN}http://localhost:5177${NC}  (Stable Audio)"
echo -e "    SFX Designer         ${CYAN}http://localhost:5178${NC}  (Stable Audio)"
echo ""
echo -e "  ${DIM}Edit tools/.env to change AI provider URLs/models.${NC}"
echo ""
