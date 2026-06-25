import { useState } from 'react'

// A copyable code block, shared by the landing page and the docs page.
export function Code({ children }: { children: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="code">
      <button
        type="button"
        className="copy"
        aria-label="Copy to clipboard"
        onClick={() => {
          void navigator.clipboard?.writeText(children).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 1400)
          })
        }}
      >
        {copied ? 'copied' : 'copy'}
      </button>
      <pre>
        <code>{children}</code>
      </pre>
    </div>
  )
}
