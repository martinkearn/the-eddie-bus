import { PageIntro } from '../../src/components/PageIntro'
import { SiteLayout } from '../../src/components/SiteLayout'
import { policyPages } from '../../src/content/pages'

export const metadata = {
  title: 'Privacy Policy | The EDDIE Bus',
  description: 'Privacy policy placeholder for The Bromsgrove Minibus Appeal Fund.',
}

export default function PrivacyPolicyPage() {
  return <PolicyPage policy={policyPages.privacy} currentPath="/privacy-policy/" />
}

function PolicyPage({ policy, currentPath }) {
  return (
    <SiteLayout currentPath={currentPath}>
      <PageIntro title={policy.title} intro={[policy.text]} label="Policy" />
    </SiteLayout>
  )
}