import type { ReactNode } from 'react'
import { useEffect } from 'react'

interface ModalProps {
  children: ReactNode
  onClose: () => void
}

export function Modal({ children, onClose }: ModalProps) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-[4px] flex items-center justify-center z-[1000] p-4"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  )
}