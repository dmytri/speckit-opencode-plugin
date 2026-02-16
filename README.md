# @dmytri/speckit-opencode-plugin

OpenCode plugin for spec-kit/specify workflow - specification-driven development.

## Installation

Add to your `opencode.json`:

```json
{
  "plugin": ["@dmytri/speckit-opencode-plugin"]
}
```

OpenCode will automatically install the plugin on next start.

## Requirements

[specify CLI](https://speckit.org) must be installed. See [speckit.org](https://speckit.org/#quick-start) for installation instructions:

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
