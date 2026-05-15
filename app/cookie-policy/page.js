import { PageIntro } from '../../src/components/PageIntro'
import { SiteLayout } from '../../src/components/SiteLayout'
import { policyPages } from '../../src/content/pages'

export const metadata = {
  title: 'Cookie Policy | The EDDIE Bus',
  description: 'Cookie policy placeholder for The EDDIE Bus website.',
}

export default function CookiePolicyPage() {
  return (
    <SiteLayout currentPath="/cookie-policy/">
      <PageIntro title={policyPages.cookies.title} intro={[policyPages.cookies.text]} label="Policy" />
    </SiteLayout>
  )
}