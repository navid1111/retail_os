export type AdminChatResult = {
  answer: string
  query?: Record<string, unknown>
  rows?: unknown[]
  rawResult?: unknown
}

export async function askAdminChat(message: string): Promise<AdminChatResult> {
  const response = await fetch('/api/admin/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ message }),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'Failed to ask admin assistant')
  }

  return data as AdminChatResult
}
