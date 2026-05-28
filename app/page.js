import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowRight,
  faCircleCheck,
  faHandHoldingHeart,
  faMapLocationDot,
  faUsers,
  faWheelchairMove,
} from '@fortawesome/free-solid-svg-icons'
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
          <InfoCard title="Accessible minibus" icon={<FontAwesomeIcon icon={faWheelchairMove} />}>
            <p>The minibus is fitted with a passenger lift for wheelchair users and people with walking difficulties.</p>
          </InfoCard>
          <InfoCard title="Group travel" icon={<FontAwesomeIcon icon={faUsers} />}>
            <p>Designed for care homes, residential groups, retired activity groups and specialist groups.</p>
          </InfoCard>
          <blockquote>“The EDDIE Bus helps local residents enjoy everyday journeys, days out and group outings in comfort and safety.”</blockquote>
        </div>
      </section>

      <section className="section-band bento-band" aria-label="Service summary">
        <CardGrid className="home-summary-grid">
          <InfoCard title="Where we operate" icon={<FontAwesomeIcon icon={faMapLocationDot} />} className="home-summary-card home-summary-card-location">
            <p>The EDDIE Bus serves Bromsgrove, nearby villages and surrounding areas, including but not limited to:</p>
            <CheckList items={homePage.operateAreas} />
            <p>{homePage.operateNote}</p>
            <Link className="home-card-link" href="/places-to-visit/">Explore places to visit <FontAwesomeIcon icon={faArrowRight} aria-hidden="true" /></Link>
          </InfoCard>
          <InfoCard title="Who we support" icon={<FontAwesomeIcon icon={faHandHoldingHeart} />} accent className="home-summary-card home-summary-card-support">
            <p>We support groups of Bromsgrove residents, including:</p>
            <PlainList items={homePage.supportGroups} />
            <p>{homePage.supportNote}</p>
          </InfoCard>
          <InfoCard title="Why choose the EDDIE Bus?" icon={<FontAwesomeIcon icon={faCircleCheck} />} className="home-summary-card home-summary-card-reasons">
            <CheckList items={homePage.reasons} />
          </InfoCard>
        </CardGrid>
      </section>

      <ContactPanel text={homePage.getInTouch} />
    </SiteLayout>
  )
}