export function PageIntro({ title, intro, image, label, className = '', actions = null, children = null }) {
  const introItems = Array.isArray(intro) ? intro : []

  return (
    <section className={`page-intro section-band ${image ? 'page-intro-image' : 'page-intro-centered'} ${className}`}>
      {image ? <img className="page-intro-bg" src={image.src} alt="" aria-hidden="true" /> : null}
      <div className="page-intro-content">
        {label ? <p className="eyebrow">{label}</p> : null}
        <h1>{title}</h1>
        {introItems.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        {actions ? <div className="page-intro-actions">{actions}</div> : null}
        {children}
      </div>
    </section>
  )
}