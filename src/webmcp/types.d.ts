interface WebMcpToolDefinition {
  name: string
  title?: string
  description: string
  inputSchema?: Record<string, unknown>
  annotations?: {
    readOnlyHint?: boolean
    untrustedContentHint?: boolean
  }
  execute: (input: unknown) => Promise<string> | string
}

interface WebMcpModelContext {
  registerTool(
    tool: WebMcpToolDefinition,
    options?: { signal?: AbortSignal; exposedTo?: string[] },
  ): Promise<void>
}

interface Document {
  modelContext?: WebMcpModelContext
}

interface Window {
  __ASCEND_SCENE_CAPTURE__?: string
  __ASCEND_RENDER_STATS__?: { children: number; width: number; height: number; climberX?: number; climberY?: number }
  __ASCEND_DEV__?: { next: () => void; previous: () => void; reset: () => void }
}
