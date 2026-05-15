import { PageIntro } from '../../src/components/PageIntro'
import { SiteLayout } from '../../src/components/SiteLayout'
import { policyPages } from '../../src/content/pages'

export const metadata = {
  title: 'Terms of Use | The EDDIE Bus',
  description: 'Terms of use placeholder for The EDDIE Bus website.',
}

export default function TermsOfUsePage() {
  return (
    <SiteLayout currentPath="/terms-of-use/">
      <PageIntro title={policyPages.terms.title} intro={[policyPages.terms.text]} label="Policy" />
    </SiteLayout>
  )
}