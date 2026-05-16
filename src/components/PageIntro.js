export function PageIntro({ title, intro, image, label, className = '' }) {
  return (
    <section className={`page-intro section-band ${image ? 'page-intro-image' : 'page-intro-centered'} ${className}`}>
      {image ? <img className="page-intro-bg" src={image.src} alt="" aria-hidden="true" /> : null}
      <div className="page-intro-content">
        {label ? <p className="eyebrow">{label}</p> : null}
        <h1>{title}</h1>
        {intro.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      </div>
    </section>
  )
}