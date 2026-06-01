interface Props {
  color: string
  children: React.ReactNode
  onClick?: () => void
}

export default function Badge({ color, children, onClick }: Props) {
  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${onClick ? 'cursor-pointer' : ''}`}
      style={{ backgroundColor: color + '22', color }}
    >
      {children}
    </span>
  )
}
