# @dmytri/speckit-opencode-plugin

[OpenCode](https://opencode.ai) plugin for [spec-kit](https://github.com/github/spec-kit) workflow - specification-driven development.

## Installation

See [OpenCode Plugins](https://opencode.ai/docs/plugins/) for full documentation.

Add to your `opencode.json`:

```json
{
  "plugin": ["@dmytri/speckit-opencode-plugin"]
}
```

OpenCode will automatically install the plugin on next start.

## Requirements

[specify CLI](https://github.com/github/spec-kit) must be installed. See [speckit.org](https://speckit.org/#quick-start) for installation instructions:

```bash
# Install with uv (recommended)
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git

# Verify installation
specify --version
```

The plugin will notify you if `specify` is not installed.

## Usage

```typescript
speckit({ action: "check" })                    // Verify specify CLI installed
speckit({ action: "new", feature: "feature-name" })  // Create new feature branch
speckit({ action: "status" })                    // Check current phase (auto-initializes .specify/)
speckit({ action: "test" })                      // Run unit tests
speckit({ action: "test", testType: "e2e" })    // Run e2e tests
speckit({ action: "context" })                   // Sync agent context
```

The plugin auto-initializes `.specify/` directory on first use via `specify init`.

## How It Works

- Agent uses plugin tool for all spec-kit operations (never uses CLI directly)
- Plugin uses `specify` CLI for initialization and checks
- Plugin uses project scripts (`.specify/scripts/bash/`) for workflow operations
