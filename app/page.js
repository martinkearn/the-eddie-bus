import Link from 'next/link'
import { ContactPanel } from '../src/components/ContactPanel'
import { CardGrid, CheckList, InfoCard, Paragraphs, PlainList } from '../src/components/ContentBlocks'
import { Hero } from '../src/components/Hero'
import { SiteLayout } from '../src/components/SiteLayout'
import { homePage } from '../src/content/pages'
import { images } from '../src/content/site'

export default function Home() {
  return (
    <SiteLayout currentPath="/">
      <Hero title={homePage.title} intro={homePage.intro} image={homePage.image} />

      <section className="accessibility-feature" aria-labelledby="what-we-do">
        <div className="feature-heading">
          <h2 id="what-we-do">What we do</h2>
          <Paragraphs items={homePage.whatWeDo} />
        </div>
        <div className="feature-media">
          <img src={images.busRear.src} alt={images.busRear.alt} />
        </div>
        <div className="feature-list">
          <InfoCard title="Accessible minibus" icon={<AccessibleIcon />}>
            <p>The minibus is fitted with a passenger lift for wheelchair users and people with walking difficulties.</p>
          </InfoCard>
          <InfoCard title="Group travel" icon={<GroupTravelIcon />}>
            <p>Designed for care homes, residential groups, retired activity groups and specialist groups.</p>
          </InfoCard>
          <blockquote>“The EDDIE Bus helps local residents enjoy everyday journeys, days out and group outings in comfort and safety.”</blockquote>
        </div>
      </section>

      <section className="section-band bento-band" aria-label="Service summary">
        <CardGrid className="home-summary-grid">
          <InfoCard title="Where we operate" icon="⌖" className="home-summary-card home-summary-card-location">
            <p>The EDDIE Bus serves Bromsgrove, nearby villages and surrounding areas, including but not limited to:</p>
            <CheckList items={homePage.operateAreas} />
            <p>{homePage.operateNote}</p>
            <Link className="home-card-link" href="/places-to-visit/">Explore places to visit</Link>
          </InfoCard>
          <InfoCard title="Who we support" icon="♡" accent className="home-summary-card home-summary-card-support">
            <p>We support groups of Bromsgrove residents, including:</p>
            <PlainList items={homePage.supportGroups} />
            <p>{homePage.supportNote}</p>
          </InfoCard>
          <InfoCard title="Why choose the EDDIE Bus?" icon="✓" className="home-summary-card home-summary-card-reasons">
            <CheckList items={homePage.reasons} />
          </InfoCard>
        </CardGrid>
      </section>

      <ContactPanel text={homePage.getInTouch} />
    </SiteLayout>
  )
}

function AccessibleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M11 4.5a2.1 2.1 0 1 1-4.2 0 2.1 2.1 0 0 1 4.2 0Z" />
      <path d="M9 8.2v4.1h4.3l2.4 5.6 2-.9-2.9-6.7h-3.4V8.2H9Z" />
      <path d="M8.7 14.1a3.9 3.9 0 1 0 3.7 5.1l-1.8-.6a2 2 0 1 1-1.9-2.7v-1.8Z" />
    </svg>
  )
}

function GroupTravelIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M7.2 11.3a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
      <path d="M16.8 11.3a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
      <path d="M12 10.2a2.9 2.9 0 1 0 0-5.8 2.9 2.9 0 0 0 0 5.8Z" />
      <path d="M4.2 19.6v-2.1c0-2.1 1.4-3.8 3.1-3.8h.5c-.5.8-.8 1.7-.8 2.8v3.1H4.2Z" />
      <path d="M8.7 19.6v-3.1c0-2.4 1.5-4.3 3.3-4.3s3.3 1.9 3.3 4.3v3.1H8.7Z" />
      <path d="M17 19.6v-3.1c0-1-.3-2-.8-2.8h.5c1.7 0 3.1 1.7 3.1 3.8v2.1H17Z" />
    </svg>
  )
}