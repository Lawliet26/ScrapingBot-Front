import { api } from './client'
import type { AgentPrompt } from './types'

export async function fetchAgentPrompt(): Promise<AgentPrompt> {
  return api.get<AgentPrompt>('/agent/prompt/')
}

export async function updateAgentPrompt(payload: Partial<AgentPrompt>): Promise<AgentPrompt> {
  return api.put<AgentPrompt>('/agent/prompt/', payload)
}
