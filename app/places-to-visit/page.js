import { ContactPanel } from '../../src/components/ContactPanel'
import { InfoCard, PlainList } from '../../src/components/ContentBlocks'
import { PageIntro } from '../../src/components/PageIntro'
import { SiteLayout } from '../../src/components/SiteLayout'
import { placesPage } from '../../src/content/pages'

export const metadata = {
  title: 'Places to Visit | The EDDIE Bus',
  description: 'Ideas for accessible group outings and day trips with The EDDIE Bus from Bromsgrove.',
}

export default function PlacesToVisitPage() {
  return (
    <SiteLayout currentPath="/places-to-visit/">
      <PageIntro title={placesPage.title} intro={placesPage.intro} label="Places to Visit" />
      <section className="places-prompt section-band" aria-label="Trip planning note">
        <p className="eyebrow">Day trip inspiration</p>
        <h2>Choose somewhere your group will enjoy</h2>
        <p>This list is intended as inspiration only. Journey distance, timings and availability are agreed as part of the booking conversation.</p>
      </section>
      <section className="category-grid places-grid" aria-label="Places to visit categories">
        {placesPage.categories.map((category) => (
          <InfoCard key={category.title} title={category.title}>
            <PlainList items={category.items} />
          </InfoCard>
        ))}
      </section>
      <ContactPanel title="Discuss a destination" text={['Please contact us to discuss your preferred destination, journey distance and availability.']} />
    </SiteLayout>
  )
}