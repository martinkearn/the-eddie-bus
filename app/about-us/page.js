import { ContactPanel } from '../../src/components/ContactPanel'
import { CheckList, Paragraphs, Section } from '../../src/components/ContentBlocks'
import { PageIntro } from '../../src/components/PageIntro'
import { SiteLayout } from '../../src/components/SiteLayout'
import { aboutPage } from '../../src/content/pages'
import { images } from '../../src/content/site'

export const metadata = {
  title: 'About Us | The EDDIE Bus',
  description: 'About The Bromsgrove Minibus Appeal Fund, the charity behind The EDDIE Bus accessible minibus service.',
}

export default function AboutUsPage() {
  const [aimSection, serviceSection, ...remainingSections] = aboutPage.sections

  return (
    <SiteLayout currentPath="/about-us/">
      <PageIntro title={aboutPage.title} intro={aboutPage.intro} image={aboutPage.image} label="About Us" />

      <section className="about-aim-section section-band" aria-label="What the charity provides">
        <div className="about-aim-main">
          <div className="about-aim-copy">
            <p className="eyebrow">Community transport charity</p>
            <div className="about-aim-heading">
              <span aria-hidden="true" />
              <h2>{aimSection.title}</h2>
            </div>
            <Paragraphs items={aimSection.paragraphs} />
          </div>
          <div className="about-aim-photo">
            <img src={images.busFrontCentered.src} alt={images.busFrontCentered.alt} />
            <p>The EDDIE Bus helps local groups stay mobile, independent and connected.</p>
          </div>
        </div>
        <div className="about-service-card">
          <div>
            <h3>{serviceSection.title}</h3>
            <Paragraphs items={serviceSection.paragraphs} />
          </div>
          {serviceSection.list ? <CheckList items={serviceSection.list} /> : null}
        </div>
      </section>

      <section className="booking-photo-panel section-band" aria-label="Inside the EDDIE Bus">
        <img src={images.busSeats.src} alt={images.busSeats.alt} />
        <div>
          <p className="eyebrow">On board</p>
          <h2>Comfortable seating for group journeys</h2>
          <p>The bus has seating for group travel, with flexible arrangements available when wheelchair spaces or mobility support are needed.</p>
        </div>
      </section>

      {remainingSections.map((section) => (
        section.title === 'The EDDIE Bus' ? (
          <section key={section.title} className="about-story-card about-story-card-compact section-band" aria-labelledby="the-eddie-bus">
            <div className="about-story-copy">
              <h2 id="the-eddie-bus">{section.title}</h2>
              <Paragraphs items={section.paragraphs} />
            </div>
            <img src={images.busSide.src} alt={images.busSide.alt} />
          </section>
        ) : section.title === 'Remembering Eddie Mowbray' ? (
          <section key={section.title} className="about-story-card about-story-card-compact about-story-card-portrait section-band" aria-labelledby="remembering-eddie-mowbray">
            <div className="about-story-copy">
              <h2 id="remembering-eddie-mowbray">{section.title}</h2>
              <Paragraphs items={section.paragraphs} />
            </div>
            <img src={images.edwinMowbray.src} alt={images.edwinMowbray.alt} />
          </section>
        ) : (
          <Section key={section.title} title={section.title} className="about-text-section">
            <Paragraphs items={section.paragraphs} />
            {section.list ? <CheckList items={section.list} /> : null}
          </Section>
        )
      ))}
      <ContactPanel title="Interested in using the service?" text={['If your group fits the eligibility criteria, please contact us to discuss your journey.']} />
    </SiteLayout>
  )
}