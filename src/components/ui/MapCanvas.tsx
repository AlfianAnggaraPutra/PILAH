import { useEffect, useRef } from 'react'
import { drawMap, type MapStyle } from '@/lib/ml/preprocess'
import { cn } from '@/lib/utils'

/** Menggambar matriks (mis. citra input atau feature map) apa adanya, piksel per piksel. */
export function MapCanvas({
  data,
  side,
  mapStyle = 'gray',
  label,
  className,
}: {
  data: Float32Array
  side: number
  mapStyle?: MapStyle
  label: string
  className?: string
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (ref.current) drawMap(ref.current, data, side, mapStyle)
  }, [data, side, mapStyle])
  return (
    <canvas
      ref={ref}
      role="img"
      aria-label={label}
      style={{ imageRendering: 'pixelated' }}
      className={cn('block', className)}
    />
  )
}
