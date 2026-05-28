import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCalendarDays,
  faCalendarXmark,
  faEnvelope,
  faMapLocationDot,
  faMoneyBillWave,
  faPhone,
  faRoute,
  faUsers,
} from '@fortawesome/free-solid-svg-icons'
import { ContactPanel } from '../../src/components/ContactPanel'
import { Callout, CardGrid, DefinitionList, InfoCard, Paragraphs, Section } from '../../src/components/ContentBlocks'
import { PageIntro } from '../../src/components/PageIntro'
import { SiteLayout } from '../../src/components/SiteLayout'
import { bookingPage } from '../../src/content/pages'
import { images, site } from '../../src/content/site'

export const metadata = {
  title: 'How to Book | The EDDIE Bus',
  description: 'How to book The EDDIE Bus for eligible Bromsgrove group outings, including charges, payment, cancellations and accessibility details.',
}

export default function HowToBookPage() {
  const whoCanBookText = bookingPage.eligibility.find((item) => item.term === 'Who can book')?.text
  const whoCanBookDefinitions = bookingPage.eligibility.filter((item) => item.term !== 'Who can book')

  const bookingSteps = [
    `Email or call us with your preferred date, destination, group size and any mobility needs.`,
    `We’ll check if the bus and volunteer driver are available.`,
    `We’ll contact you to confirm the booking, times and pick-up details.`,
  ]

  const bookingStepNote = `After the trip, we’ll confirm the final mileage and send payment details.`

  return (
    <SiteLayout currentPath="/how-to-book/">
      <PageIntro
        title={bookingPage.title}
        intro={[
          bookingPage.intro[0],
          `Book by email or phone. Email is preferred because it helps us capture all journey details clearly.`,
        ]}
        image={images.busSide}
        label="How to Book"
        className="booking-hero"
      >
        <div className="booking-hero-process" aria-label="Booking process">
          <p className="booking-process-kicker">Start here</p>
          <h2>Booking process</h2>
          <ol className="step-list booking-hero-step-list">
            {bookingSteps.map((step) => <li key={step}>{step}</li>)}
          </ol>
          <p>{bookingStepNote}</p>
        </div>
        <div className="page-intro-actions">
          <Link className="button button-light" href={site.emailHref}><FontAwesomeIcon icon={faEnvelope} aria-hidden="true" />Email booking request</Link>
          <span>Prefer to talk? Call <Link href={site.phoneHref}><FontAwesomeIcon icon={faPhone} aria-hidden="true" /> {site.phone}</Link>.</span>
        </div>
      </PageIntro>

      <section className="booking-intro-highlights booking-intro-highlights-featured section-band" aria-label="Quick booking details">
        <p><strong>Groups:</strong> usually 6 to 13 people, including carers where needed.</p>
        <p><strong>Typical availability:</strong> daytime trips, every day except Christmas to New Year.</p>
        <p><strong>Guide price:</strong> £1.25 per mile, with a £25 minimum charge.</p>
      </section>

      <section className="section-band" aria-label="Charges and payment">
        <CardGrid>
          <InfoCard title="Payment" icon={<FontAwesomeIcon icon={faMoneyBillWave} />}>
            <Paragraphs items={bookingPage.payment} />
          </InfoCard>
          <InfoCard title="Cancellations" icon={<FontAwesomeIcon icon={faCalendarXmark} />}><Paragraphs items={bookingPage.cancellations} /></InfoCard>
          <InfoCard title="Who can book" icon={<FontAwesomeIcon icon={faUsers} />}>
            {whoCanBookText ? <p>{whoCanBookText}</p> : null}
            <DefinitionList items={whoCanBookDefinitions} />
          </InfoCard>
        </CardGrid>
      </section>

      <section className="detail-pair section-band" aria-label="Travel and availability">
        <InfoCard title="Where the bus can travel" icon={<FontAwesomeIcon icon={faRoute} />}>
          <Paragraphs items={bookingPage.travel} />
        </InfoCard>
        <InfoCard title="When the bus is available" icon={<FontAwesomeIcon icon={faCalendarDays} />}><Paragraphs items={bookingPage.availability} /></InfoCard>
      </section>
      <Callout title="Looking for trip ideas?">
        <p><FontAwesomeIcon icon={faMapLocationDot} aria-hidden="true" /> Visit the <Link href="/places-to-visit/">Places to Visit</Link> page for suggestions for your next group outing.</p>
      </Callout>
      <ContactPanel title="Contact Us" text={['Contact us if you need transport for your group and would like to discuss your plans. We’d love to hear from you.']} />
    </SiteLayout>
  )
}