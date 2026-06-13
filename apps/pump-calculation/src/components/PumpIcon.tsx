import type { SVGProps } from "react"

/** Centrifugal pump SVG icon — uses currentColor so it adapts to light/dark themes. */
export function PumpIcon({ width = 24, height = 24, ...props }: SVGProps<SVGSVGElement> & { width?: number; height?: number }) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={width}
      height={height}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M 23,60 a 29,29 0 1,0 58,0 a 29,29 0 1,0 -58,0
           M 32,60 a 20,20 0 1,0 40,0 a 20,20 0 1,0 -40,0
           M 2,54 L 34,54 L 34,66 L 2,66 Z
           M 46,2 L 58,2 L 58,42 L 46,42 Z
           M 52,42 L 64,54 L 40,54 Z
           M 48,62 a 4,4 0 1,0 8,0 a 4,4 0 1,0 -8,0"
      />
    </svg>
  )
}
