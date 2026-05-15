import { ContactPanel } from '../../src/components/ContactPanel'
import { CardGrid, CheckList, InfoCard, Paragraphs } from '../../src/components/ContentBlocks'
import { PageIntro } from '../../src/components/PageIntro'
import { SiteLayout } from '../../src/components/SiteLayout'
import { volunteeringPage } from '../../src/content/pages'
import { images } from '../../src/content/site'

export const metadata = {
  title: 'Volunteering | The EDDIE Bus',
  description: 'Volunteer with The EDDIE Bus as a driver or helper supporting elderly and disabled residents in Bromsgrove.',
}

export default function VolunteeringPage() {
  return (
    <SiteLayout currentPath="/volunteering/">
      <PageIntro title={volunteeringPage.title} intro={volunteeringPage.intro} image={volunteeringPage.image} label="Volunteering" />

      <section className="volunteer-driver section-band" aria-label="Volunteer driver information">
        <div className="volunteer-driver-intro">
          <p className="eyebrow">Driver volunteers needed</p>
          <h2>Become a volunteer driver</h2>
          <Paragraphs items={volunteeringPage.driverText.slice(0, 1)} />
        </div>
        <figure className="volunteer-photo">
          <img src={images.parksideCourt.src} alt={images.parksideCourt.alt} />
          <figcaption>Volunteer drivers help local groups get out and about safely.</figcaption>
        </figure>
        <div className="volunteer-driver-details">
          <Paragraphs items={volunteeringPage.driverText.slice(2)} />
        </div>
        <aside>
          <h3>You may be suitable if you have:</h3>
          <CheckList items={volunteeringPage.driverRequirements} />
        </aside>
      </section>

      <section className="section-band" aria-label="Volunteer checks and helper roles">
        <CardGrid>
          <InfoCard title="Driver checks and training"><Paragraphs items={volunteeringPage.checks} /></InfoCard>
          <InfoCard title="Become a volunteer helper"><p>{volunteeringPage.helper}</p></InfoCard>
          <InfoCard title="Why volunteer?" accent><p>{volunteeringPage.why}</p></InfoCard>
        </CardGrid>
      </section>
      <ContactPanel title="Get involved" text={volunteeringPage.getInvolved} />
    </SiteLayout>
  )
}