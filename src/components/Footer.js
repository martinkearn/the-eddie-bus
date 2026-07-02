import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCalendarCheck,
  faEnvelope,
  faHandshake,
  faHouse,
  faMapLocationDot,
  faKey,
  faPhone,
  faShieldHeart,
  faUsers,
} from '@fortawesome/free-solid-svg-icons'
import { primaryNavigation, site } from '../content/site'

const footerPages = [
  { label: 'Home', href: '/' },
  { label: 'Book', href: '/how-to-book/' },
  { label: 'About', href: '/about-us/' },
  { label: 'Places', href: '/places-to-visit/' },
  { label: 'Policies', href: '/policies/' },
  { label: 'Volunteer', href: '/volunteering/' },
  { label: 'Admin Portal', href: '/admin' },
  { label: 'Bookings Form', href: '/bookings/' },
]

const footerPageIcons = {
  '/': faHouse,
  '/how-to-book/': faCalendarCheck,
  '/about-us/': faUsers,
  '/places-to-visit/': faMapLocationDot,
  '/policies/': faShieldHeart,
  '/volunteering/': faHandshake,
  '/admin': faKey,
  '/bookings/': faCalendarCheck,
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div>
          <h2 className="footer-brand">{site.publicName}</h2>
          <p>{site.publicName} is run by {site.charityName}, a registered charity established in 1985.</p>
          <p>We provide accessible transport for care homes, residential groups, retired activity groups and specialist groups in Bromsgrove, nearby villages and surrounding areas.</p>
          <p>Registered charity number: {site.charityNumber}</p>
        </div>
        <div>
          <h2>Contact</h2>
          <p><a href={site.emailHref}><FontAwesomeIcon icon={faEnvelope} aria-hidden="true" />{site.email}</a></p>
          <p><a href={site.phoneHref}><FontAwesomeIcon icon={faPhone} aria-hidden="true" />{site.phone}</a></p>
        </div>
        <div>
          <h2>Pages</h2>
          <ul className="footer-links">
            {footerPages.map((item) => (
              <li key={item.href}><Link href={item.href}><FontAwesomeIcon icon={footerPageIcons[item.href]} aria-hidden="true" />{item.label}</Link></li>
            ))}
          </ul>
        </div>
      </div>
      <div className="footer-legal">
        <p>© {site.charityName} (Registered Charity No. {site.charityNumber}). All rights reserved.</p>
      </div>
    </footer>
  )
}