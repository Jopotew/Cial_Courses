interface StarRatingProps {
  rating: number
  small?: boolean
}

export function StarRating({ rating, small }: StarRatingProps) {
  const full = Math.floor(rating)
  const half = rating % 1 >= 0.5
  const size = small ? 14 : 16

  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => {
        let fill: string
        if (i <= full) fill = '#f59e0b'
        else if (i === full + 1 && half) fill = 'url(#half-grad)'
        else fill = '#d1d5db'

        return (
          <svg key={i} width={size} height={size} viewBox="0 0 16 16" fill={fill}>
            <defs>
              <linearGradient id="half-grad">
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="50%" stopColor="#d1d5db" />
              </linearGradient>
            </defs>
            <path d="M8 1l1.8 3.6 4 .6-2.9 2.8.7 4L8 10l-3.6 1.9.7-4L2.2 5.2l4-.6z" />
          </svg>
        )
      })}
    </span>
  )
}