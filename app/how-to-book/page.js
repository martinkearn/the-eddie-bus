import Link from 'next/link'
import { ContactPanel } from '../../src/components/ContactPanel'
import { Callout, CardGrid, DefinitionList, InfoCard, Paragraphs, PlainList, Section } from '../../src/components/ContentBlocks'
import { SiteLayout } from '../../src/components/SiteLayout'
import { bookingPage } from '../../src/content/pages'
import { images, site } from '../../src/content/site'

export const metadata = {
  title: 'How to Book | The EDDIE Bus',
  description: 'How to book The EDDIE Bus for eligible Bromsgrove group outings, including charges, payment, cancellations and accessibility details.',
}

export default function HowToBookPage() {
  return (
    <SiteLayout currentPath="/how-to-book/">
      <section className="booking-intro section-band" aria-labelledby="booking-heading">
        <p className="eyebrow">How to Book</p>
        <h1 id="booking-heading">{bookingPage.title}</h1>
        <p>{bookingPage.intro[0]}</p>
      </section>

      <section className="booking-panel section-band" aria-label="Booking process and charges">
        <div className="booking-process-card">
          <h2>Booking process</h2>
          <ol className="step-list">
            {bookingPage.steps.map((step) => <li key={step}>{step}</li>)}
          </ol>
          <p>{bookingPage.stepNote}</p>
          <div className="booking-process-actions">
            <Link className="button button-primary" href={site.emailHref}>{site.primaryCta}</Link>
            <Link className="booking-phone-link" href={site.phoneHref}>Or call {site.phone}</Link>
          </div>
        </div>
        <aside className="booking-price-card">
          <h2>Hire charge</h2>
          <Paragraphs items={bookingPage.hireCharge} />
        </aside>
      </section>

      <section className="booking-photo-panel section-band" aria-label="Inside the EDDIE Bus">
        <img src={images.busSeats.src} alt={images.busSeats.alt} />
        <div>
          <p className="eyebrow">On board</p>
          <h2>Comfortable seating for group journeys</h2>
          <p>The bus has seating for group travel, with flexible arrangements available when wheelchair spaces or mobility support are needed.</p>
        </div>
      </section>

      <section className="section-band" aria-label="Charges and payment">
        <CardGrid>
          <InfoCard title="Payment"><Paragraphs items={bookingPage.payment} /></InfoCard>
          <InfoCard title="Cancellations"><Paragraphs items={bookingPage.cancellations} /></InfoCard>
          <InfoCard title="Eligibility definitions"><DefinitionList items={bookingPage.eligibility} /></InfoCard>
        </CardGrid>
      </section>

      <section className="detail-pair section-band" aria-label="Travel and availability">
        <InfoCard title="Where the bus can travel">
          <Paragraphs items={bookingPage.travel} />
          <Link className="booking-card-link" href="/places-to-visit/">Get ideas for places to visit</Link>
        </InfoCard>
        <InfoCard title="When the bus is available"><Paragraphs items={bookingPage.availability} /></InfoCard>
      </section>
      <Section title="Who can book?">
        <p>The EDDIE Bus is available for groups of Bromsgrove residents from:</p>
        <PlainList items={bookingPage.bookers} />
        <p>{bookingPage.bookersNote}</p>
      </Section>
      <Section title="Carers and support"><Paragraphs items={bookingPage.carers} /></Section>
      <Callout title="Looking for trip ideas?">
        <p>Visit the <Link href="/places-to-visit/">Places to Visit</Link> page for suggestions for your next group outing.</p>
      </Callout>
      <ContactPanel title="Booking contact details" text={[`Email is preferred, but you are also welcome to phone ${site.phone}.`]} />
    </SiteLayout>
  )
}