import { useRef } from 'react'

interface CodeInputProps {
  value: string
  onChange: (val: string) => void
  error?: string
}

export function CodeInput({ value, onChange, error }: CodeInputProps) {
  const inputs = useRef<(HTMLInputElement | null)[]>([])
  const digits = value.split('').concat(Array(6).fill('')).slice(0, 6)

  function handleKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      e.preventDefault()
      const next = digits.map((d, j) => (j === i ? '' : d)).join('')
      onChange(next)
      if (i > 0) inputs.current[i - 1]?.focus()
    } else if (/^\d$/.test(e.key)) {
      e.preventDefault()
      const next = digits.map((d, j) => (j === i ? e.key : d)).join('')
      onChange(next)
      if (i < 5) inputs.current[i + 1]?.focus()
    }
    // other keys (Enter, Tab, etc.) propagate normally
  }

  return (
    <div>
      <label className="block text-[13px] font-semibold text-gray-700 mb-2.5">
        Código de verificación
      </label>
      <div className="flex gap-2.5 justify-center">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { inputs.current[i] = el }}
            value={d}
            onKeyDown={(e) => handleKey(i, e)}
            readOnly
            autoFocus={i === 0}
            style={{
              width: 52,
              height: 60,
              textAlign: 'center',
              fontSize: 24,
              fontWeight: 700,
              border: `2px solid ${error && !d ? '#ef4444' : d ? '#7c3aed' : '#e2d9f7'}`,
              borderRadius: 12,
              outline: 'none',
              fontFamily: 'inherit',
              color: '#1a1a2e',
              background: d ? '#f5f3ff' : '#fff',
              transition: 'border-color .15s',
            }}
          />
        ))}
      </div>
      {error && (
        <p className="text-xs text-red-500 text-center mt-2">{error}</p>
      )}
    </div>
  )
}