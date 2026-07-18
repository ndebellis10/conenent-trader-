const VIDEO_ID = 'jjlTggnOfs4'

export default function HeatMaps() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', margin: '-24px', overflow: 'hidden' }}>
      <iframe
        src={`https://www.youtube.com/embed/${VIDEO_ID}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3`}
        style={{ flex: 1, width: '100%', border: 'none', display: 'block' }}
        allow="autoplay; accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        title="Heat Maps"
      />
    </div>
  )
}
