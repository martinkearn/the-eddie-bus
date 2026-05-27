import Link from 'next/link'
import { BookingRequestSection } from '../../src/components/BookingRequestSection'
import { ContactPanel } from '../../src/components/ContactPanel'
import { Callout, CardGrid, DefinitionList, InfoCard, Paragraphs } from '../../src/components/ContentBlocks'
import { PageIntro } from '../../src/components/PageIntro'
import { SiteLayout } from '../../src/components/SiteLayout'
import { bookingPage } from '../../src/content/pages'
import { images, site } from '../../src/content/site'

export const metadata = {
  title: 'Bookings | The EDDIE Bus',
  description: 'Book The EDDIE Bus for eligible Bromsgrove group outings, including charges, payment, cancellations and accessibility details.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function BookingsPage() {
  const bookingApiEndpoint = process.env.NEXT_PUBLIC_BOOKING_API_ENDPOINT || ''
  const bookingAvailabilityEndpoint = process.env.NEXT_PUBLIC_BOOKING_AVAILABILITY_ENDPOINT || ''
  const simpleBookingSteps = [
    'Pick your date in the calendar.',
    'Complete the booking request form.',
    'We confirm availability and contact you with next steps.',
  ]

  return (
    <SiteLayout currentPath="/bookings/">
      <PageIntro
        title={bookingPage.title}
        intro={bookingPage.intro.slice(0, 2)}
        image={images.busSide}
        label="Bookings"
        className="booking-hero"
      >
        <div className="booking-hero-process" aria-label="Booking process">
          <p className="booking-process-kicker">How to book</p>
          <h2>Book in 3 steps</h2>
          <ol className="step-list booking-hero-step-list">
            {simpleBookingSteps.map((step) => <li key={step}>{step}</li>)}
          </ol>
        </div>
        <div className="page-intro-actions">
          <Link className="button button-light" href="#booking-request">Start booking form</Link>
          <span>The form is preferred for the fastest response, but booking by <Link href={site.emailHref}>email</Link> or <Link href={site.phoneHref}>phone</Link> is also valid.</span>
        </div>
      </PageIntro>

      <BookingRequestSection
        emailHref={site.emailHref}
        fallbackPhone={site.phone}
        fallbackPhoneHref={site.phoneHref}
        bookingApiEndpoint={bookingApiEndpoint}
        bookingAvailabilityEndpoint={bookingAvailabilityEndpoint}
        showIntro={false}
        sectionId="booking-request"
      />

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
      <Callout title="Looking for trip ideas?">
        <p>Visit the <Link href="/places-to-visit/">Places to Visit</Link> page for suggestions for your next group outing.</p>
      </Callout>
      <ContactPanel title="Contact details" text={['The booking form above is the quickest way to request a trip, but email and phone bookings are always welcome too.']} />
    </SiteLayout>
  )
}
