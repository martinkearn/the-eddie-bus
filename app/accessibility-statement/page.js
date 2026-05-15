import { PageIntro } from '../../src/components/PageIntro'
import { SiteLayout } from '../../src/components/SiteLayout'
import { policyPages } from '../../src/content/pages'

export const metadata = {
  title: 'Accessibility Statement | The EDDIE Bus',
  description: 'Accessibility statement placeholder for The EDDIE Bus website.',
}

export default function AccessibilityStatementPage() {
  return (
    <SiteLayout currentPath="/accessibility-statement/">
      <PageIntro title={policyPages.accessibility.title} intro={[policyPages.accessibility.text]} label="Policy" />
    </SiteLayout>
  )
}