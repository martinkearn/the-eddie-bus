import { ContactPanel } from '../../src/components/ContactPanel'
import { Callout, CardGrid, CheckList, InfoCard, Paragraphs, Section } from '../../src/components/ContentBlocks'
import { PageIntro } from '../../src/components/PageIntro'
import { SiteLayout } from '../../src/components/SiteLayout'
import { accessibilityPage } from '../../src/content/pages'
import { images } from '../../src/content/site'

export const metadata = {
  title: 'Wheelchair Policy | The EDDIE Bus',
  description: 'Passenger capacity, wheelchair access, driver responsibilities and carer responsibilities for The EDDIE Bus.',
}

export default function PassengerAccessibilityPolicyPage() {
  return (
    <SiteLayout currentPath="/passenger-accessibility-policy/">
      <PageIntro title={accessibilityPage.title} intro={accessibilityPage.intro} image={accessibilityPage.image} label="Policy" />
      <section className="section-band capacity-band" aria-label="Passenger capacity">
        <CardGrid>
          {accessibilityPage.capacities.map((capacity) => (
            <InfoCard key={capacity.title} title={capacity.title} accent={capacity.title === 'Standard seating'}>
              <p className="capacity-label">Maximum capacity</p>
              <p className="capacity-value">{capacity.capacity}</p>
              <Paragraphs items={capacity.paragraphs} />
            </InfoCard>
          ))}
        </CardGrid>
      </section>
      <section className="accessibility-photo-panel section-band" aria-labelledby="tail-lift-heading">
        <img src={images.tailLift.src} alt={images.tailLift.alt} />
        <div>
          <p className="eyebrow">Tail lift access</p>
          <h2 id="tail-lift-heading">Accessible boarding from the rear of the bus</h2>
          <p>The rear tail lift helps wheelchair users and passengers with limited mobility board the vehicle safely with support from carers and the driver.</p>
        </div>
      </section>
      <Callout title="Important safety note"><Paragraphs items={accessibilityPage.safety} /></Callout>
      <Section title="Driver responsibilities" className="driver-responsibilities-section">
        <div className="driver-responsibilities-layout">
          <img src={images.busRearLiftUp.src} alt={images.busRearLiftUp.alt} />
          <div>
            <p>The driver is responsible for:</p>
            <CheckList items={accessibilityPage.driverResponsibilities} />
            <p>{accessibilityPage.driverBoundary}</p>
          </div>
        </div>
      </Section>
      <Section title="Carers and support">
        <p>Carers are responsible for:</p>
        <CheckList items={accessibilityPage.carerResponsibilities} />
        <Paragraphs items={accessibilityPage.carerNote} />
      </Section>
      <ContactPanel title="Contact Us" text={['Whether you are enquiring about transport for your group, interested in volunteering as a driver or helper, or would simply like to find out more, we would love to hear from you.']} />
    </SiteLayout>
  )
}