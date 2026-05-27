import { site } from '../content/site'

export function ContactPanel({ title = 'Get in touch', text = [] }) {
  return (
    <section className="contact-panel" aria-labelledby="contact-panel-title">
      <div className="contact-panel-main">
        <h2 id="contact-panel-title">{title}</h2>
        {text.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        <div className="contact-methods">
          <a href={site.emailHref}>
            <span aria-hidden="true">@</span>
            <small>Email Us</small>
            <strong>{site.email}</strong>
          </a>
          <a href={site.phoneHref}>
            <span aria-hidden="true">☎</span>
            <small>Call Us Directly</small>
            <strong>{site.phone}</strong>
          </a>
        </div>
      </div>
      <div className="contact-panel-highlight">
        <h3>40 Years of Service</h3>
        <p>Since 1985, {site.publicName} has helped Bromsgrove residents get out and about safely as part of a group.</p>
        <div>
          <small>Registration Details</small>
          <strong>{site.charityName}</strong>
          <span>Registered Charity No. {site.charityNumber}</span>
        </div>
      </div>
    </section>
  )
}