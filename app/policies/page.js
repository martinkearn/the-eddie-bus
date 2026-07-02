import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faBusSimple,
  faCircleExclamation,
  faDownload,
  faFilePdf,
  faPersonWalking,
  faWheelchair,
  faWheelchairMove,
} from '@fortawesome/free-solid-svg-icons'
import { ContactPanel } from '../../src/components/ContactPanel'
import { CardGrid, CheckList, DefinitionList, InfoCard, Paragraphs, Section } from '../../src/components/ContentBlocks'
import { PageIntro } from '../../src/components/PageIntro'
import { SiteLayout } from '../../src/components/SiteLayout'
import { accessibilityPage } from '../../src/content/pages'
import { images } from '../../src/content/site'

const policyDocuments = [
  {
    title: 'Privacy Policy',
    description: 'How The EDDIE Bus handles personal information and protects passenger data.',
    fileName: 'BROMSGROVE MINIBUS APPEAL FUND CHARITY - Privacy Policy - July 2026.pdf',
  },
  {
    title: 'Data Protection Policy',
    description: 'The charity’s approach to lawful, secure and responsible handling of data.',
    fileName: 'BROMSGROVE MINIBUS APPEAL FUND CHARITY - Data Protection Policy - July 2026.pdf',
  },
  {
    title: 'Document Retention Schedule',
    description: 'How long records are kept and when they are securely disposed of.',
    fileName: 'BROMSGROVE MINIBUS APPEAL FUND CHARITY - Document Retention Schedule - July 2026.pdf',
  },
]

export const metadata = {
  title: 'Policies | The EDDIE Bus',
  description: 'Passenger capacity, wheelchair access, driver responsibilities and carer responsibilities for The EDDIE Bus.',
}

export default function PassengerAccessibilityPolicyPage() {
  return (
    <SiteLayout currentPath="/policies/">
      <PageIntro title="Policies" intro={accessibilityPage.intro} image={accessibilityPage.image} label="Policies" />
      <Section title="Wheelchairs and accessibility" className="section-band policy-access-section">
        <div className="policy-access-lead">
          <img src={images.tailLift.src} alt={images.tailLift.alt} />
          <div>
            <p>The rear tail lift helps wheelchair users and passengers with limited mobility board the vehicle safely with support from carers and the driver.</p>
          </div>
        </div>
        <InfoCard title="Passenger capacity" className="policy-capacity-card" icon={<FontAwesomeIcon icon={faBusSimple} />}>
          <p className="policy-capacity-summary">Passenger numbers depend on whether people transfer from wheelchairs, remain in a static wheelchair, or travel in a powered wheelchair. The driver always makes the final decision on what can be carried safely.</p>
          <DefinitionList
            items={accessibilityPage.capacities.map((capacity) => ({
              term: capacity.title,
              text: capacitySummary(capacity),
            }))}
          />
          <p className="policy-capacity-note-title">Important safety note</p>
          <Paragraphs items={accessibilityPage.safety} />
        </InfoCard>
        <div className="policy-support-stack">
          <InfoCard title="Driver responsibilities">
            <div className="policy-support-card-content">
              <img src={images.busRearLiftUp.src} alt={images.busRearLiftUp.alt} />
              <div>
                <p>The driver is responsible for:</p>
                <CheckList items={accessibilityPage.driverResponsibilities} />
                <p>{accessibilityPage.driverBoundary}</p>
              </div>
            </div>
          </InfoCard>
          <InfoCard title="Carers and support">
            <p>Carers are responsible for:</p>
            <CheckList items={accessibilityPage.carerResponsibilities} />
            <Paragraphs items={accessibilityPage.carerNote} />
          </InfoCard>
        </div>
      </Section>
      <Section title="Downloadable policy documents" className="policy-downloads-section">
        <p>These documents are available to download as PDFs.</p>
        <CardGrid className="policy-download-grid">
          {policyDocuments.map((document) => (
            <InfoCard
              key={document.title}
              title={document.title}
              icon={<FontAwesomeIcon icon={faFilePdf} />}
            >
              <p>{document.description}</p>
              <p>
                <a className="button button-secondary" href={policyFileHref(document.fileName)} download>
                  <FontAwesomeIcon icon={faDownload} aria-hidden="true" />
                  Download PDF
                </a>
              </p>
            </InfoCard>
          ))}
        </CardGrid>
      </Section>
      <ContactPanel title="Contact Us" text={['Whether you are enquiring about transport for your group, interested in volunteering as a driver or helper, or would simply like to find out more, we would love to hear from you.']} />
    </SiteLayout>
  )
}

function capacityIcon(title) {
  if (title === 'Standard seating') return faBusSimple
  if (title === 'Wheelchair transfers') return faPersonWalking
  if (title === 'Static wheelchairs') return faWheelchair
  return faWheelchairMove
}

function policyFileHref(fileName) {
  return encodeURI(`/policies/${fileName}`)
}

function capacitySummary(capacity) {
  if (capacity.title === 'Standard seating') {
    return '13 passengers: 11 seats in the main passenger area plus 2 at the front with the driver.'
  }

  if (capacity.title === 'Wheelchair transfers') {
    return 'Up to 6 passengers who transfer from wheelchairs or walking aids, plus up to 7 able-bodied passengers. Wheelchairs are folded and stored at the rear, and walking-aid users count within the transfer total.'
  }

  if (capacity.title === 'Static wheelchairs') {
    return 'Up to 3 static wheelchair users, with capacity for additional passengers depending on the final seating layout. Each static wheelchair must be secured to the floor with the correct restraints and seat belts, and one seat must be removed for each wheelchair.'
  }

  return 'Usually 1 powered wheelchair user, plus additional passengers depending on the final seating layout. It must be secured front and rear to the floor with a seat belt, and two seats must be removed; if space allows, one static wheelchair may also be accommodated at the driver’s discretion.'
}