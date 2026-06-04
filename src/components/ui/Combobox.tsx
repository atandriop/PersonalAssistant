'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'

interface ComboboxProps {
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder?: string
  className?: string
  required?: boolean
}

export default function Combobox({ value, onChange, options, placeholder, className = '', required }: ComboboxProps) {
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = value.length > 0
    ? options.filter(o => o.toLowerCase().includes(value.toLowerCase()))
    : options

  const showAddOption = value.trim().length > 0 && !options.some(o => o.toLowerCase() === value.toLowerCase())
  const displayItems: string[] = showAddOption ? [...filtered, `__add__:${value.trim()}`] : filtered
  const visibleItems = displayItems.slice(0, 50)

  useEffect(() => {
    setHighlighted(0)
  }, [value])

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [])

  function select(item: string) {
    const val = item.startsWith('__add__:') ? item.slice(8) : item
    onChange(val)
    setOpen(false)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open) { if (e.key === 'ArrowDown') { setOpen(true); return } }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted(h => Math.min(h + 1, visibleItems.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlighted(h => Math.max(h - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); if (visibleItems[highlighted]) select(visibleItems[highlighted]) }
    else if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        required={required}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm ${className}`}
        autoComplete="off"
      />
      {open && visibleItems.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full max-h-52 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg">
          {visibleItems.map((item, i) => {
            const isAdd = item.startsWith('__add__:')
            const label = isAdd ? `Add "${item.slice(8)}"` : item
            return (
              <li
                key={item}
                onMouseDown={() => select(item)}
                onMouseEnter={() => setHighlighted(i)}
                className={`px-3 py-2 text-sm cursor-pointer ${
                  i === highlighted
                    ? 'bg-blue-600 text-white'
                    : isAdd
                    ? 'text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                    : 'text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {label}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
