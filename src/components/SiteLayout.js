import { Footer } from './Footer'
import { Header } from './Header'

export function SiteLayout({ children, currentPath }) {
  return (
    <>
      <Header currentPath={currentPath} />
      <main id="main-content">
        {children}
      </main>
      <Footer />
    </>
  )
}