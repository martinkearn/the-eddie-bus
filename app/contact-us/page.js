import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleQuestion, faEnvelope, faPhone } from '@fortawesome/free-solid-svg-icons'
import { CheckList, Paragraphs } from '../../src/components/ContentBlocks'
import { SiteLayout } from '../../src/components/SiteLayout'
import { contactPage } from '../../src/content/pages'
import { site } from '../../src/content/site'

export const metadata = {
  title: 'Contact Us | The EDDIE Bus',
  description: 'Contact The EDDIE Bus to book a group trip, ask about accessibility, volunteer or find out more about the charity.',
}

export default function ContactUsPage() {
  return (
    <SiteLayout currentPath="/contact-us/">
      <section className="contact-direct section-band" aria-labelledby="contact-heading">
        <div className="contact-direct-main">
          <p className="eyebrow">Contact Us</p>
          <h1 id="contact-heading">{contactPage.title}</h1>
          <Paragraphs items={contactPage.intro.slice(0, 1)} />
          <p>{contactPage.note}</p>
          <div className="contact-methods contact-direct-methods">
            <a href={site.emailHref}>
              <span aria-hidden="true"><FontAwesomeIcon icon={faEnvelope} /></span>
              <small>Email Us</small>
              <strong>{site.email}</strong>
            </a>
            <a href={site.phoneHref}>
              <span aria-hidden="true"><FontAwesomeIcon icon={faPhone} /></span>
              <small>Call Us Directly</small>
              <strong>{site.phone}</strong>
            </a>
          </div>
        </div>
        <aside className="contact-reasons-card">
          <h2><FontAwesomeIcon icon={faCircleQuestion} aria-hidden="true" /> Please get in touch if you would like to</h2>
          <CheckList items={contactPage.reasons} />
        </aside>
      </section>
    </SiteLayout>
  )
}