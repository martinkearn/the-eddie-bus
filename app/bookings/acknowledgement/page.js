import { BookingAcknowledgementPanel } from '../../../src/components/BookingAcknowledgementPanel'
import { PageIntro } from '../../../src/components/PageIntro'
import { SiteLayout } from '../../../src/components/SiteLayout'
import { images } from '../../../src/content/site'

export const metadata = {
  title: 'Booking acknowledgement | The EDDIE Bus',
  description: 'Booking acknowledgement and summary of your submitted request details.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function BookingAcknowledgementPage() {
  return (
    <SiteLayout currentPath="/how-to-book/">
      <PageIntro
        title="Booking request received"
        intro={[
          'Thank you for submitting your booking request.',
          'Please review the summary below and keep your booking reference for future contact.',
        ]}
        image={images.busSide}
        label="Booking acknowledgement"
        className="booking-hero booking-request-hero"
      />

      <BookingAcknowledgementPanel />
    </SiteLayout>
  )
}
