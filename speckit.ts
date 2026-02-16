import { type Plugin, tool } from "@opencode-ai/plugin"

async function checkSpecifyInstalled(): Promise<boolean> {
  try {
    await Bun.$`specify --version`.text()
    return true
  } catch {
    return false
  }
}

async function ensureSpecifyInitialized(worktree: string): Promise<{ initialized: boolean; message?: string }> {
  const dotSpecifyExists = await Bun.$`test -d ${worktree}/.specify && echo yes`.text()
  
  if (dotSpecifyExists.trim() === "yes") {
    return { initialized: true }
  }
  
  try {
    await Bun.$`cd ${worktree} && specify init . --ai opencode --force`.text()
    return { initialized: true }
  } catch (error) {
    return { 
      initialized: false, 
      message: `Failed to initialize spec-kit: ${error}` 
    }
  }
}

const SpeckitPlugin: Plugin = async (ctx) => {
  return {
    tool: {
      speckit: tool({
        description: "Run spec-kit workflows for specification-driven development",
        args: {
          action: tool.schema.enum(["init", "check", "new", "status", "test", "context"]).describe("What to do"),
          feature: tool.schema.string().optional().describe("Feature name for 'new' action"),
          testType: tool.schema.enum(["unit", "e2e", "all"]).optional().describe("Test type for 'test' action"),
        },
        async execute(args, context) {
          const { action, feature, testType } = args
          const { worktree } = context

          const specifyInstalled = await checkSpecifyInstalled()
          if (!specifyInstalled) {
            return JSON.stringify({ 
              success: false, 
              error: "specify CLI not installed. Install with: pip install specify-cli (or brew install specify)" 
            })
          }

          switch (action) {
            case "init": {
              const target = feature ?? "."
              const result = await Bun.$`cd ${worktree} && specify init ${target} --ai opencode --force`.text()
              return JSON.stringify({ success: true, output: result })
            }

            case "check": {
              const result = await Bun.$`specify check`.text()
              return JSON.stringify({ success: true, output: result })
            }

            case "new": {
              if (!feature) {
                return JSON.stringify({ success: false, error: "feature name required" })
              }
              
              const initResult = await ensureSpecifyInitialized(worktree)
              if (!initResult.initialized) {
                return JSON.stringify({ success: false, error: initResult.message })
              }
              
              const result = await Bun.$`bash ${worktree}/.specify/scripts/bash/create-new-feature.sh ${feature}`.text()
              return JSON.stringify({ success: true, output: result })
            }

            case "status": {
              const initResult = await ensureSpecifyInitialized(worktree)
              if (!initResult.initialized && initResult.message) {
                return JSON.stringify({ success: false, error: initResult.message })
              }

              let branch = "main"
              try {
                const gitBranch = await Bun.$`cd ${worktree} && git rev-parse --abbrev-ref HEAD`.text()
                branch = gitBranch.trim()
              } catch {}

              const isFeatureBranch = /^[0-9]{3}-/.test(branch)

              if (!isFeatureBranch) {
                return JSON.stringify({
                  branch,
                  featureDir: "",
                  docs: [],
                  phase: "specify",
                  readyFor: [],
                  message: "Not on a feature branch. Use 'speckit({ action: 'new', feature: 'name' })' to create one."
                })
              }

              const pathsResult = await Bun.$`bash ${worktree}/.specify/scripts/bash/check-prerequisites.sh --paths-only`.text()
              
              const paths: Record<string, string> = {}
              for (const line of pathsResult.trim().split("\n")) {
                const [key, ...valueParts] = line.split(": ")
                if (key && valueParts.length > 0) {
                  paths[key] = valueParts.join(": ")
                }
              }

              const featureDir = paths.FEATURE_DIR || ""

              const docs: string[] = []
              const possibleDocs = ["spec.md", "plan.md", "tasks.md", "research.md", "data-model.md", "quickstart.md"]
              
              if (featureDir) {
                for (const doc of possibleDocs) {
                  try {
                    const exists = await Bun.$`test -f ${featureDir}/${doc} && echo yes`.text()
                    if (exists.trim() === "yes") {
                      docs.push(doc)
                    }
                  } catch {}
                }
              }

              let phase = "specify"
              if (docs.includes("spec.md")) phase = "plan"
              if (docs.includes("spec.md") && docs.includes("plan.md")) phase = "tasks"
              if (docs.includes("spec.md") && docs.includes("plan.md") && docs.includes("tasks.md")) phase = "implement"

              return JSON.stringify({
                branch,
                featureDir,
                docs,
                phase,
                readyFor: getReadyFor(docs)
              })
            }

            case "test": {
              const type = testType ?? "all"
              if (type === "unit" || type === "all") {
                const unitResult = await Bun.$`cd ${worktree} && bun test`.text()
                if (type === "unit") return JSON.stringify({ success: true, output: unitResult, type: "unit" })
              }
              if (type === "e2e" || type === "all") {
                const e2eResult = await Bun.$`cd ${worktree} && bun run test:e2e`.text()
                return JSON.stringify({ success: true, output: e2eResult, type: "e2e" })
              }
              return JSON.stringify({ success: true, output: "No tests requested" })
            }

            case "context": {
              const initResult = await ensureSpecifyInitialized(worktree)
              if (!initResult.initialized && initResult.message) {
                return JSON.stringify({ success: false, error: initResult.message })
              }
              
              const result = await Bun.$`bash ${worktree}/.specify/scripts/bash/update-agent-context.sh`.text()
              return JSON.stringify({ success: true, output: result })
            }

            default:
              return JSON.stringify({ success: false, error: `Unknown action: ${action}` })
          }
        },
      }),
    },
  }
}

function getReadyFor(docs: string[]): string[] {
  const ready: string[] = []
  if (docs.includes("spec.md")) ready.push("plan")
  if (docs.includes("plan.md")) ready.push("tasks")
  if (docs.includes("tasks.md")) ready.push("implement")
  return ready
}

export default SpeckitPlugin
