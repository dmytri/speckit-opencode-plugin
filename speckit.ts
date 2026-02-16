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

async function getProjectPhase(worktree: string): Promise<{ phase: string; docs: string[]; readyFor: string[]; message?: string }> {
  let branch = "main"
  try {
    const gitBranch = await Bun.$`cd ${worktree} && git rev-parse --abbrev-ref HEAD`.text()
    branch = gitBranch.trim()
  } catch {}

  const isFeatureBranch = /^[0-9]{3}-/.test(branch)

  if (!isFeatureBranch) {
    return {
      phase: "specify",
      docs: [],
      readyFor: [],
      message: "Not on a feature branch. Use 'speckit({ action: 'new', feature: 'name' })' to create one."
    }
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
  const possibleDocs = ["spec.md", "plan.md", "tasks.md", "research.md", "data-model.md", "quickstart.md", "constitution.md"]
  
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
  if (docs.includes("constitution.md")) phase = "constitution"
  if (docs.includes("spec.md")) phase = "plan"
  if (docs.includes("spec.md") && docs.includes("plan.md")) phase = "tasks"
  if (docs.includes("spec.md") && docs.includes("plan.md") && docs.includes("tasks.md")) phase = "implement"

  const readyFor: string[] = []
  if (!docs.includes("constitution.md")) readyFor.push("constitution")
  else if (!docs.includes("spec.md")) readyFor.push("specify")
  else if (!docs.includes("plan.md")) readyFor.push("plan")
  else if (!docs.includes("tasks.md")) readyFor.push("tasks")
  else readyFor.push("implement")

  return { phase, docs, readyFor }
}

const PHASE_GUIDANCE: Record<string, { description: string; command: string; next: string[] }> = {
  constitution: {
    description: "Project principles established",
    command: "/speckit.constitution",
    next: ["specify"]
  },
  specify: {
    description: "Requirements defined",
    command: "/speckit.specify",
    next: ["clarify", "plan"]
  },
  plan: {
    description: "Technical plan created",
    command: "/speckit.plan",
    next: ["tasks"]
  },
  tasks: {
    description: "Tasks broken down",
    command: "/speckit.tasks",
    next: ["analyze", "implement"]
  },
  implement: {
    description: "Implementation in progress",
    command: "/speckit.implement",
    next: []
  }
}

const SpeckitPlugin: Plugin = async (ctx) => {
  return {
    tool: {
      speckit: tool({
        description: "Run spec-kit workflows for specification-driven development",
        args: {
          action: tool.schema.enum(["init", "check", "status", "phase"]).describe("What to do"),
          feature: tool.schema.string().optional().describe("Feature name for 'new' action"),
        },
        async execute(args, context) {
          const { action, feature } = args
          const { worktree } = context

          const specifyInstalled = await checkSpecifyInstalled()
          if (!specifyInstalled) {
            return JSON.stringify({ 
              success: false, 
              error: "specify CLI not installed. See https://speckit.org/#quick-start for installation instructions."
            })
          }

          switch (action) {
            case "init": {
              const initResult = await ensureSpecifyInitialized(worktree)
              if (!initResult.initialized) {
                return JSON.stringify({ success: false, error: initResult.message })
              }
              return JSON.stringify({ 
                success: true, 
                message: "spec-kit initialized. Use 'speckit({ action: 'phase' })' to check current workflow phase." 
              })
            }

            case "check": {
              try {
                const result = await Bun.$`specify check`.text()
                return JSON.stringify({ success: true, output: result })
              } catch (error) {
                return JSON.stringify({ success: false, error: `Check failed: ${error}` })
              }
            }

            case "status":
            case "phase": {
              const initResult = await ensureSpecifyInitialized(worktree)
              if (!initResult.initialized) {
                return JSON.stringify({ success: false, error: initResult.message })
              }

              const { phase, docs, readyFor, message } = await getProjectPhase(worktree)
              const guidance = PHASE_GUIDANCE[phase]

              return JSON.stringify({
                success: true,
                phase,
                docs,
                readyFor,
                guidance: {
                  currentPhase: phase,
                  description: guidance?.description,
                  command: guidance?.command,
                  next: guidance?.next,
                  message
                },
                workflow: {
                  phases: ["constitution", "specify", "plan", "tasks", "implement"],
                  description: "Run the appropriate /speckit.* command for each phase. Use 'speckit({ action: 'phase' })' to check progress."
                }
              })
            }

            default:
              return JSON.stringify({ success: false, error: `Unknown action: ${action}` })
          }
        },
      }),
    },
  }
}

export default SpeckitPlugin
