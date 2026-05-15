import Link from 'next/link'
import { site } from '../content/site'

export function Hero({ title, intro, image, eyebrow = 'Serving Bromsgrove since 1985' }) {
  return (
    <section className="hero section-band">
      <div className="hero-copy">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {intro.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        <div className="button-row">
          <Link className="button button-primary" href="/how-to-book/">{site.primaryCta}</Link>
          <Link className="button button-secondary" href="/volunteering/">Find out about volunteering</Link>
        </div>
      </div>
      {image ? (
        <div className="hero-image-frame">
          <img src={image.src} alt={image.alt} />
          <div className="image-badge">
            <strong>Our 13-seat EDDIE Bus</strong>
          </div>
        </div>
      ) : null}
    </section>
  )
}