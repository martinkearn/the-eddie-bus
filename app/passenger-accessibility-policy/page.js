import { RouteRedirect } from '../../src/components/RouteRedirect'

export const metadata = {
  title: 'Passenger Accessibility Policy | The EDDIE Bus',
  description: 'Redirects to the new policies page for The EDDIE Bus.',
}

export default function PassengerAccessibilityPolicyRedirectPage() {
  return <RouteRedirect to="/policies/" />
}