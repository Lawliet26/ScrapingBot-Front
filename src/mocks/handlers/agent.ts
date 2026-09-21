import type { AgentPrompt } from '@/api/types'
import { INITIAL_AGENT_PROMPT } from '../data/agent'
import { badRequest, ok, route } from '../router'

let prompt: AgentPrompt = { ...INITIAL_AGENT_PROMPT }

route('GET', '/agent/prompt/', () => ok(prompt))

route('PUT', '/agent/prompt/', ({ body }) => {
  const payload = (body ?? {}) as Partial<AgentPrompt>
  const errors = []
  if (!payload.system_prompt?.trim()) errors.push({ field: 'system_prompt', message: 'El prompt no puede estar vacío.' })
  if (!(Number(payload.debounce_seconds) >= 1)) {
    errors.push({ field: 'debounce_seconds', message: 'El debounce debe ser de al menos 1 segundo.' })
  }
  if (errors.length) return badRequest(errors)

  prompt = { ...prompt, ...payload }
  return ok(prompt)
})
