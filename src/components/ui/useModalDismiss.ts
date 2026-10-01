'use client'

import { useEffect } from 'react'

/**
 * Close-on-Escape for modal-like overlays.
 *
 * ui/Modal installed this listener, but seven forms hand-rolled their own
 * backdrop markup instead of using it, so those seven silently did not close on
 * Escape while the sixteen using Modal did.
 */
export function useEscapeKey(onClose: () => void) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
}

/** Props for a hand-rolled backdrop that should also close on an outside click. */
export function backdropProps(onClose: () => void) {
  return { onClick: onClose, role: 'presentation' as const }
}

/** Props for the panel inside such a backdrop, so inside clicks do not close it. */
export const panelProps = {
  onClick: (e: React.MouseEvent) => e.stopPropagation(),
  role: 'dialog' as const,
  'aria-modal': true,
}
