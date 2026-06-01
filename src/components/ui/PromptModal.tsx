'use client'

import { useState, useEffect } from 'react'

interface Props {
  title: string
  prompt: string
  onClose: () => void
}

export default function PromptModal({ title, prompt, onClose }: Props) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function copy() {
    await navigator.clipboard.writeText(prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-2xl mx-4 flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none">&times;</button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <textarea
            readOnly value={prompt} rows={12}
            className="w-full text-sm font-mono border border-gray-200 rounded-lg px-3 py-2 resize-none dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 text-gray-700"
          />
        </div>
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
          <button onClick={copy} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            {copied ? 'Copied!' : 'Copy to clipboard'}
          </button>
          <button onClick={onClose} className="px-4 py-2 text-sm border rounded-lg dark:border-gray-600 dark:text-gray-300">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
