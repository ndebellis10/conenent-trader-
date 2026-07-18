/* Alan mascot — a crowned, bearded figure in the app's accent color.
   Drop-in for a lucide icon (accepts `size` and `color`). Temporary stand-in
   until the real 3D mascot PNG is added at /alan.png. */
export default function AlanMascot({ size = 24, color = '#3B82F6', style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={style} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Face */}
      <circle cx="16" cy="19" r="8.4" fill={color} opacity="0.92" />
      {/* Beard */}
      <path d="M7.8 18c0 5.2 3.7 9.4 8.2 9.4s8.2-4.2 8.2-9.4c0 0-3.1 2.1-8.2 2.1s-8.2-2.1-8.2-2.1z" fill="#141414" opacity="0.5" />
      {/* Eyes */}
      <circle cx="12.9" cy="17" r="1.15" fill="#141414" />
      <circle cx="19.1" cy="17" r="1.15" fill="#141414" />
      {/* Crown */}
      <path d="M6 11.5l3.2 3 3.6-5.6L16 6l3.2 2.9 3.6 5.6 3.2-3-1.3 6H7.3z" fill={color} stroke={color} strokeWidth="0.5" strokeLinejoin="round" />
      {/* Crown jewels */}
      <circle cx="6" cy="11.5" r="1.25" fill={color} />
      <circle cx="16" cy="6" r="1.5" fill={color} />
      <circle cx="26" cy="11.5" r="1.25" fill={color} />
    </svg>
  )
}
