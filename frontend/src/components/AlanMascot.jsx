/* Alan mascot — the "Ask Alan" AI avatar.
   Renders the full Alan illustration (not a face crop). The artwork is square
   with a black background, so it sits flush on the app's dark surfaces.
   Accepts `size` (and an optional `style`) so it drops in wherever a lucide
   icon was used. */
export default function AlanMascot({ size = 24, style }) {
  return (
    <div
      aria-label="Alan"
      style={{
        width: size,
        height: size,
        borderRadius: 10,
        backgroundImage: 'url(/alan.png)',
        backgroundSize: 'contain',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#000',
        flexShrink: 0,
        ...style,
      }}
    />
  )
}
