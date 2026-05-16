export function Section({ title, children, className = '' }) {
  return (
    <section className={`content-section ${className}`} aria-labelledby={slugify(title)}>
      <h2 id={slugify(title)}>{title}</h2>
      {children}
    </section>
  )
}

export function Paragraphs({ items }) {
  return items.map((item, index) => <p key={`${index}-${item}`}>{item}</p>)
}

export function CheckList({ items }) {
  return (
    <ul className="check-list">
      {items.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}
    </ul>
  )
}

export function PlainList({ items }) {
  return (
    <ul className="plain-list">
      {items.map((item, index) => {
        const label = typeof item === 'string' ? item : item.label

        return (
          <li key={`${index}-${label}`}>
            {typeof item === 'string' ? item : <a href={item.href} target="_blank" rel="noopener noreferrer">{item.label}</a>}
          </li>
        )
      })}
    </ul>
  )
}

export function CardGrid({ children, className = '' }) {
  return <div className={`card-grid ${className}`}>{children}</div>
}

export function InfoCard({ title, children, accent, className = '', icon }) {
  return (
    <article className={`info-card ${accent ? 'info-card-accent' : ''} ${className}`}>
      {icon ? <span className="summary-icon" aria-hidden="true">{icon}</span> : null}
      <h3>{title}</h3>
      {children}
    </article>
  )
}

export function DefinitionList({ items }) {
  return (
    <div className="definition-list">
      {items.map((item) => (
        <div key={item.term}>
          <dt>{item.term}</dt>
          <dd>{item.text}</dd>
        </div>
      ))}
    </div>
  )
}

export function Callout({ title, children }) {
  return (
    <aside className="callout">
      <h2>{title}</h2>
      {children}
    </aside>
  )
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}