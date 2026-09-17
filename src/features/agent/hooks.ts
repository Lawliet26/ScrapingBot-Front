import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchAgentPrompt, updateAgentPrompt } from '@/api/agent'
import type { AgentPrompt } from '@/api/types'

export function useAgentPromptQuery() {
  return useQuery({
    queryKey: ['agent', 'prompt'],
    queryFn: fetchAgentPrompt,
  })
}

export function useUpdateAgentPrompt() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: Partial<AgentPrompt>) => updateAgentPrompt(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(['agent', 'prompt'], data)
    },
  })
}
