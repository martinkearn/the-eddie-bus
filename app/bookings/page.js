import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCalendarDays,
  faCalendarXmark,
  faClipboardList,
  faMapLocationDot,
  faMoneyBillWave,
  faPhone,
  faRoute,
  faUsers,
} from '@fortawesome/free-solid-svg-icons'
import { ContactPanel } from '../../src/components/ContactPanel'
import { Callout, CardGrid, CheckList, DefinitionList, InfoCard } from '../../src/components/ContentBlocks'
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
  const bookingIntro = [
    'Accessible group transport for eligible Bromsgrove bookings.',
    'Check the essentials, then send your request.',
  ]

  const paymentHighlights = [
    'We charge £1.25 per mile.',
    'Minimum charge is £25.',
    'Mileage is from the bus storage area (B61 7EZ) to collection point(s), destination, drop-off point(s), then back to storage.',
    'Disability Blue Badge usually means no parking charges during trips.',
    'Payment is preferred by bank transfer, cheque is also accepted. We issue an invoice after the trip once final mileage is confirmed.',
    'Payment is expected within one month of the journey.',
  ]

  const cancellationHighlights = [
    'Cancel at least 24 hours before the trip: no charge.',
    'Cancel with less than 24 hours notice: £25 charge.',
    'No charge if the EDDIE Bus cancels for vehicle issues or driver availability.',
    'Weather-related cancellations are usually accepted without charge.',
  ]

  const eligibilityHighlights = [
    {
      term: 'Who can book?',
      text: 'Care homes, residential homes/apartments, retired activity groups, over-60s social groups, and specialist groups supporting elderly or disabled residents.',
    },
    { term: 'Who is elderly?', text: 'A person aged 60 or over.' },
    { term: 'Group size', text: 'Typically 6 to 13 people, including adult carers where needed.' },
    { term: 'Adult carers', text: 'Carers can travel with the group and do not need to meet passenger eligibility criteria.' },
  ]

  const travelHighlights = [
    'Group day trips and group outings.',
    'Usually up to 100 miles each way (longer journeys may be possible by discussion).',
    'Trips are normally daytime only; evening trips are generally unavailable.',
    'All journeys must start and finish on the same day (no overnight trips).',
    'Motorway travel is allowed.',
  ]

  const availabilityHighlights = [
    'Available every day except between Christmas Eve and New Year\'s Day.',
    'Bookings depend on both bus and volunteer driver availability.',
    'Use the booking request form to check your preferred date.',
  ]

  return (
    <SiteLayout currentPath="/bookings/">
      <PageIntro
        title="Book the EDDIE Bus"
        intro={bookingIntro}
        image={images.busSide}
        label="Bookings"
        className="booking-hero"
      >
        <div className="booking-hero-process" aria-label="Booking process">
          <p className="booking-process-kicker">How to book</p>
          <h2>3 quick steps</h2>
          <ol className="step-list booking-hero-step-list">
            <li>Check the key booking details on this page.</li>
            <li>Start <Link href="/bookings/request">booking request</Link> to send your details.</li>
            <li>We check availability and get back to you.</li>
          </ol>
        </div>
        <div className="page-intro-actions">
          <Link className="button button-light" href="/bookings/request"><FontAwesomeIcon icon={faClipboardList} aria-hidden="true" />Start booking request</Link>
          <span>You can also book by <Link href={site.emailHref}>email</Link> or <Link href={site.phoneHref}><FontAwesomeIcon icon={faPhone} aria-hidden="true" /> phone</Link>.</span>
        </div>
      </PageIntro>

      <section className="section-band booking-info-showcase" aria-label="Booking essentials">
        <div className="booking-info-header">
          <p className="eyebrow">Booking essentials</p>
          <h2>Everything you need to know, at a glance</h2>
          <p>Key policies and trip guidance, grouped for quick scanning before you request a date.</p>
        </div>

        <CardGrid className="booking-info-grid">
          <InfoCard title="Payment" icon={<FontAwesomeIcon icon={faMoneyBillWave} />} className="booking-info-card booking-info-card-payment booking-info-card-half">
            <CheckList items={paymentHighlights} />
          </InfoCard>

          <InfoCard title="Cancellations" icon={<FontAwesomeIcon icon={faCalendarXmark} />} className="booking-info-card booking-info-card-cancellations booking-info-card-half">
            <CheckList items={cancellationHighlights} />
          </InfoCard>

          <InfoCard title="Eligibility" icon={<FontAwesomeIcon icon={faUsers} />} className="booking-info-card booking-info-card-eligibility booking-info-card-full">
            <DefinitionList items={eligibilityHighlights} />
          </InfoCard>

          <InfoCard title="Where the bus can travel" icon={<FontAwesomeIcon icon={faRoute} />} className="booking-info-card booking-info-card-travel booking-info-card-half">
            <CheckList items={travelHighlights} />
            <Link className="booking-card-link" href="/places-to-visit/"><FontAwesomeIcon icon={faMapLocationDot} aria-hidden="true" />Get ideas for places to visit</Link>
          </InfoCard>

          <InfoCard title="When the bus is available" icon={<FontAwesomeIcon icon={faCalendarDays} />} className="booking-info-card booking-info-card-availability booking-info-card-half">
            <CheckList items={availabilityHighlights} />
          </InfoCard>
        </CardGrid>
      </section>

      <Callout title="Looking for trip ideas?">
        <p><FontAwesomeIcon icon={faMapLocationDot} aria-hidden="true" /> See <Link href="/places-to-visit/">Places to Visit</Link> for outing ideas.</p>
      </Callout>
      <section className="booking-bottom-cta" aria-labelledby="booking-bottom-cta-title">
        <div>
          <p className="eyebrow">Ready to book?</p>
          <h2 id="booking-bottom-cta-title">Send us your trip details</h2>
        </div>
        <Link className="button button-light" href="/bookings/request"><FontAwesomeIcon icon={faClipboardList} aria-hidden="true" />Start booking request</Link>
      </section>
      <ContactPanel
        title="Contact details"
        text={['Use the booking request form for the quickest response. Email and phone bookings are also welcome.']}
        showBookNow={false}
      />
    </SiteLayout>
  )
}
