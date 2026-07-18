/* Alan mascot — the "Ask Alan" AI avatar.
   The artwork is a transparent-background cutout of the full figure, so it
   renders with no plate or backing colour behind it and sits cleanly on any
   surface. Accepts `size` (and an optional `style`) so it drops in wherever a
   lucide icon was used. */
export default function AlanMascot({ size = 24, style }) {
  return (
    <div
      aria-label="Alan"
      style={{
        width: size,
        height: size,
        backgroundImage: 'url(/alan.png)',
        backgroundSize: 'contain',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        flexShrink: 0,
        ...style,
      }}
    />
  )
}
