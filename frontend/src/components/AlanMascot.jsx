/* Alan mascot — the "Ask Alan" AI avatar.
   Renders the Alan portrait as a round, face-focused avatar. Accepts `size`
   (and an optional `style`) so it drops in wherever a lucide icon was used. */
export default function AlanMascot({ size = 24, style }) {
  return (
    <div
      aria-label="Alan"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundImage: 'url(/alan.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#0A0A0A',
        flexShrink: 0,
        ...style,
      }}
    />
  )
}
