# AGENTS.md - Developer Guide

## Spec-Kit Workflow

This project uses spec-kit for specification-driven development. All work flows through the spec-kit phases.

### Getting Started

Run this first to initialize and check current phase:

```
speckit({ action: "phase" })
```

This will auto-initialize `.specify/` if needed and return current phase with guidance.

### Phase Workflow

| Phase | Action | Slash Command |
|-------|--------|---------------|
| Start | `speckit({ action: "phase" })` | - |
| Constitution | Create principles | `/speckit.constitution` |
| Specify | Define requirements | `/speckit.specify` |
| Plan | Technical plan | `/speckit.plan` |
| Tasks | Break into tasks | `/speckit.tasks` |
| Implement | Execute tasks | `/speckit.implement` |

### Commands

```typescript
speckit({ action: "phase" })  // Check current phase + auto-init
speckit({ action: "init" })   // Initialize spec-kit
speckit({ action: "check" }) // Verify CLI installed
```

## Development

```bash
# Test changes
# (add test commands as needed)
```
