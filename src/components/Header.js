import Link from 'next/link'
import { primaryNavigation, site } from '../content/site'

export function Header({ currentPath }) {
  return (
    <header className="site-header">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <nav className="nav-shell" aria-label="Primary navigation">
        <Link className="brand" href="/" aria-label="The EDDIE Bus home">
          <img src="/logo.png" alt="The EDDIE Bus logo" />
        </Link>
        <div className="nav-links">
          {primaryNavigation.map((item) => (
            <Link
              key={item.href}
              className={item.href === currentPath ? 'active' : undefined}
              href={item.href}
              aria-current={item.href === currentPath ? 'page' : undefined}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <div className="nav-actions">
          <Link className="button button-quiet" href="/contact-us/">Contact Us</Link>
          <Link className="button button-primary" href="/how-to-book/">{site.primaryCta}</Link>
        </div>
        <details className="mobile-menu">
          <summary aria-label="Open navigation menu">
            <span aria-hidden="true"></span>
            <span aria-hidden="true"></span>
            <span aria-hidden="true"></span>
          </summary>
          <div className="mobile-menu-panel">
            <p className="mobile-menu-tagline">{site.slogan}</p>
            {primaryNavigation.map((item) => (
              <Link
                key={item.href}
                className={item.href === currentPath ? 'active' : undefined}
                href={item.href}
                aria-current={item.href === currentPath ? 'page' : undefined}
              >
                {item.label}
              </Link>
            ))}
            <div className="mobile-menu-actions">
              <Link className="button button-quiet" href="/contact-us/">Contact Us</Link>
              <Link className="button button-primary" href="/how-to-book/">{site.primaryCta}</Link>
            </div>
          </div>
        </details>
      </nav>
      <p className="header-slogan">{site.slogan}</p>
    </header>
  )
}