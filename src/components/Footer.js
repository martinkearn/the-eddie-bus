import Link from 'next/link'
import { primaryNavigation, site } from '../content/site'

const footerPages = primaryNavigation.filter((item) => item.href !== '/passenger-accessibility-policy/')

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
          <p><a href={site.emailHref}>{site.email}</a></p>
          <p><a href={site.phoneHref}>{site.phone}</a></p>
        </div>
        <div>
          <h2>Pages</h2>
          <ul className="footer-links">
            {footerPages.map((item) => (
              <li key={item.href}><Link href={item.href}>{item.label}</Link></li>
            ))}
          </ul>
        </div>
      </div>
      <div className="footer-legal">
        <p>© {site.charityName} (Registered Charity No. {site.charityNumber}). All rights reserved.</p>
        <p>Last updated: 15 May 2026, 13:20 BST</p>
      </div>
    </footer>
  )
}