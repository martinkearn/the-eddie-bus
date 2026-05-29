import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { BookingRequestSection } from '../../../src/components/BookingRequestSection'
import { PageIntro } from '../../../src/components/PageIntro'
import { SiteLayout } from '../../../src/components/SiteLayout'
import { images, site } from '../../../src/content/site'

export const metadata = {
	title: 'Booking Request | The EDDIE Bus',
	description: 'Submit a booking request for The EDDIE Bus by selecting an available date and sending your journey details.',
	robots: {
		index: false,
		follow: false,
	},
}

export default function BookingRequestPage() {
	const bookingApiEndpoint = process.env.NEXT_PUBLIC_BOOKING_API_ENDPOINT || ''
	const bookingAvailabilityEndpoint = process.env.NEXT_PUBLIC_BOOKING_AVAILABILITY_ENDPOINT || ''

	return (
		<SiteLayout currentPath="/how-to-book/">
			<PageIntro
				title="Booking request form"
				intro={[
					'Choose an available date, then complete the form with your journey details.',
					'We will review your request and contact you to confirm final booking details once driver availability is checked.',
				]}
				image={images.busSide}
				label="Booking Request"
				className="booking-hero booking-request-hero"
			>
				<div className="booking-hero-process" aria-label="Booking request guidance">
					<p className="booking-process-kicker">Before you begin</p>
					<h2>Have these details ready</h2>
					<ol className="step-list booking-hero-step-list">
						<li>Your preferred booking date and pickup time.</li>
						<li>Group and destination details.</li>
						<li>Any mobility or transfer requirements.</li>
					</ol>
				</div>
				<div className="page-intro-actions">
					<span>See the <Link href="/bookings/">booking information page</Link> for information on charges, eligibility and policies.</span>
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
		</SiteLayout>
	)
}
