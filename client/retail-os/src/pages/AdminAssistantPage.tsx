import { useMemo, useState } from 'react'
import { AdminLayout } from '../components/admin/AdminLayout'
import { Icon } from '../components/dashboard/Icon'
import { askAdminChat, type AdminChatResult } from '../services/adminChat'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
  result?: AdminChatResult
}

const suggestions = [
  'How many visits happened today?',
  'Generate compliance report',
  'Show low-performing stores',
  'Top reps this week',
]

function getRowColumns(rows: unknown[] | undefined): string[] {
  if (!rows?.length || typeof rows[0] !== 'object' || rows[0] === null) {
    return []
  }

  return Object.keys(rows[0] as Record<string, unknown>).slice(0, 10)
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '-'
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '0'
    }

    return `${value.length} item${value.length === 1 ? '' : 's'}`
  }

  if (typeof value === 'object') {
    return JSON.stringify(value)
  }

  return String(value)
}

function MarkdownTable({ lines }: { lines: string[] }) {
  const rows = lines
    .filter((line) => line.trim().startsWith('|'))
    .map((line) =>
      line
        .trim()
        .replace(/^\||\|$/g, '')
        .split('|')
        .map((cell) => cell.trim())
    )
  const header = rows[0] ?? []
  const body = rows.slice(2)

  if (header.length === 0) {
    return null
  }

  return (
    <div className="admin-chat-table">
      <table>
        <thead>
          <tr>
            {header.map((cell) => (
              <th key={cell}>{cell}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, index) => (
            <tr key={index}>
              {header.map((cell, cellIndex) => (
                <td key={`${cell}-${cellIndex}`}>{row[cellIndex] ?? '-'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function renderInlineMarkdown(text: string) {
  const segments = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)

  return segments.map((segment, index) => {
    if (segment.startsWith('**') && segment.endsWith('**')) {
      return <strong key={index}>{segment.slice(2, -2)}</strong>
    }

    if (segment.startsWith('`') && segment.endsWith('`')) {
      return <code key={index}>{segment.slice(1, -1)}</code>
    }

    return segment
  })
}

function MessageContent({ text }: { text: string }) {
  const lines = text.split(/\r?\n/)
  const blocks: Array<{ type: 'table' | 'list' | 'paragraph'; lines: string[] }> = []
  let current: { type: 'table' | 'list' | 'paragraph'; lines: string[] } | null = null

  const flush = () => {
    if (current && current.lines.length > 0) {
      blocks.push(current)
    }
    current = null
  }

  lines.forEach((line) => {
    const trimmed = line.trim()

    if (!trimmed) {
      flush()
      return
    }

    const type = trimmed.startsWith('|')
      ? 'table'
      : /^[-*]\s+/.test(trimmed)
        ? 'list'
        : 'paragraph'

    if (!current || current.type !== type) {
      flush()
      current = { type, lines: [] }
    }

    current.lines.push(line)
  })

  flush()

  return (
    <>
      {blocks.map((block, index) => {
        if (block.type === 'table') {
          return <MarkdownTable key={index} lines={block.lines} />
        }

        if (block.type === 'list') {
          return (
            <ul className="admin-chat-list" key={index}>
              {block.lines.map((line, itemIndex) => (
                <li key={itemIndex}>{renderInlineMarkdown(line.replace(/^[-*]\s+/, ''))}</li>
              ))}
            </ul>
          )
        }

        return (
          <p key={index}>
            {renderInlineMarkdown(block.lines.join(' '))}
          </p>
        )
      })}
    </>
  )
}

function ResultTable({ rows }: { rows?: unknown[] }) {
  const columns = useMemo(() => getRowColumns(rows), [rows])

  if (!rows?.length || columns.length === 0) {
    return null
  }

  return (
    <div className="admin-chat-table">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 8).map((row, index) => {
            const record = row as Record<string, unknown>

            return (
              <tr key={index}>
                {columns.map((column) => (
                  <td key={column}>{formatCell(record[column])}</td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'
  const hasMarkdownTable = /\n\|.+\|\n\|[\s:|.-]+\|/.test(message.text)

  return (
    <article className={`admin-chat-message ${isUser ? 'admin-chat-message--user' : ''}`}>
      {!isUser ? (
        <div className="admin-chat-message__icon">
          <Icon name="smart_toy" />
        </div>
      ) : null}
      <div className="admin-chat-message__body">
        <MessageContent text={message.text} />
        {!hasMarkdownTable ? <ResultTable rows={message.result?.rows} /> : null}
        {message.result?.query ? (
          <details className="admin-chat-query">
            <summary>Query</summary>
            <pre>{JSON.stringify(message.result.query, null, 2)}</pre>
          </details>
        ) : null}
      </div>
    </article>
  )
}

export function AdminAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Ask about visits, stores, users, fraud flags, image history, or compliance reports. I will inspect the database structure before querying it.',
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const submitMessage = async (value: string) => {
    const message = value.trim()
    if (!message || isLoading) {
      return
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: message,
    }

    setMessages((current) => [...current, userMessage])
    setInput('')
    setError('')
    setIsLoading(true)

    try {
      const result = await askAdminChat(message)
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: result.answer,
          result,
        },
      ])
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Failed to ask assistant'
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AdminLayout title="RetailOS AI Assistant">
      <section className="admin-chat-page">
        <div className="admin-chat-composer">
          <form
            className="admin-chat-input"
            onSubmit={(event) => {
              event.preventDefault()
              void submitMessage(input)
            }}
          >
            <input
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask anything..."
              type="text"
              value={input}
            />
            <button aria-label="Send message" disabled={isLoading} type="submit">
              <Icon name={isLoading ? 'hourglass_top' : 'arrow_upward'} />
            </button>
          </form>

          <div className="admin-chat-suggestions">
            {suggestions.map((suggestion) => (
              <button
                disabled={isLoading}
                key={suggestion}
                onClick={() => void submitMessage(suggestion)}
                type="button"
              >
                <Icon
                  name={
                    suggestion.includes('report')
                      ? 'description'
                      : suggestion.includes('stores')
                        ? 'warning'
                        : suggestion.includes('reps')
                          ? 'leaderboard'
                          : 'query_stats'
                  }
                />
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        {error ? <div className="admin-chat-error">{error}</div> : null}

        <div className="admin-chat-thread">
          {messages.map((message) => (
            <ChatBubble key={message.id} message={message} />
          ))}
          {isLoading ? (
            <article className="admin-chat-message">
              <div className="admin-chat-message__icon">
                <Icon name="smart_toy" />
              </div>
              <div className="admin-chat-message__body admin-chat-message__body--loading">
                Inspecting database and preparing query
              </div>
            </article>
          ) : null}
        </div>
      </section>
    </AdminLayout>
  )
}
