import { embedUrl, type VideoRef } from '@/lib/videoEmbed'

/** Responsive 16:9 video player used for auto-embedded YouTube/Vimeo links. */
export default function VideoEmbed({ video, title }: { video: VideoRef; title?: string }) {
  return (
    <div className="my-4 aspect-video overflow-hidden rounded-section glass-card">
      <iframe
        src={embedUrl(video)}
        title={title || 'Video'}
        loading="lazy"
        allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
        allowFullScreen
        className="h-full w-full"
      />
    </div>
  )
}
