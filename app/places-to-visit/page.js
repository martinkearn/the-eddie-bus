import { ContactPanel } from '../../src/components/ContactPanel'
import { InfoCard, PlainList } from '../../src/components/ContentBlocks'
import { PageIntro } from '../../src/components/PageIntro'
import { SiteLayout } from '../../src/components/SiteLayout'
import { placesPage } from '../../src/content/pages'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faBuildingColumns,
  faLandmark,
  faLeaf,
  faMasksTheater,
  faOtter,
  faShoppingBag,
  faTree,
  faUmbrellaBeach,
} from '@fortawesome/free-solid-svg-icons'

export const metadata = {
  title: 'Places to Visit | The EDDIE Bus',
  description: 'Ideas for accessible group outings and day trips with The EDDIE Bus from Bromsgrove.',
}

const categoryIcons = {
  'Garden centres': faLeaf,
  'Towns and places to explore': faUmbrellaBeach,
  'Museums and heritage attractions': faBuildingColumns,
  Theatres: faMasksTheater,
  Activities: faOtter,
  'Stately homes and historic sites': faLandmark,
  'Parks and gardens': faTree,
  'Retail and shopping destinations': faShoppingBag,
  'Zoos, wildlife and animal attractions': faOtter,
}

export default function PlacesToVisitPage() {
  return (
    <SiteLayout currentPath="/places-to-visit/">
      <PageIntro title={placesPage.title} intro={placesPage.intro} image={placesPage.image} label="Places to Visit" className="places-hero" />
      <section className="category-grid places-grid" aria-label="Places to visit categories">
        {placesPage.categories.map((category) => (
          <InfoCard key={category.title} title={category.title} icon={<FontAwesomeIcon icon={categoryIcons[category.title] ?? faUmbrellaBeach} />}>
            <PlainList items={category.items} />
          </InfoCard>
        ))}
      </section>
      <ContactPanel title="Contact Us" text={['Contact us if you need transport for your group and would like to discuss your plans. We’d love to hear from you.']} />
    </SiteLayout>
  )
}