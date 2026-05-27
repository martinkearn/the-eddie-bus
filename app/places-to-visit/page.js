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
      <PageIntro title={placesPage.title} intro={placesPage.intro} image={placesPage.image} label="Places to Visit" className="places-hero" />
      <section className="category-grid places-grid" aria-label="Places to visit categories">
        {placesPage.categories.map((category) => (
          <InfoCard key={category.title} title={category.title}>
            <PlainList items={category.items} />
          </InfoCard>
        ))}
      </section>
      <ContactPanel title="Contact Us" text={['Contact us if you need transport for your group and would like to discuss your plans. We’d love to hear from you.']} />
    </SiteLayout>
  )
}