'use client'

import { useEscapeKey } from './useModalDismiss'

export type ModalWidth = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'

const WIDTH_CLASS: Record<ModalWidth, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
}

interface Props {
  title: string
  onClose: () => void
  children: React.ReactNode
  /** Defaults to 'lg'. Wider forms that used to hand-roll a backdrop pass larger. */
  width?: ModalWidth
}

export default function Modal({ title, onClose, children, width = 'lg' }: Props) {
  useEscapeKey(onClose)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full ${WIDTH_CLASS[width]} max-h-[90vh] overflow-y-auto`}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none">&times;</button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  )
}
