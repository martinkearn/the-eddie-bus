import './globals.css'

export const metadata = {
  title: 'EDDIE Bus | New Website Coming Soon',
  description:
    'EDDIE Bus (Everyday Drives for Disabled, Independent and Elderly) is rebuilding its website. Contact details are available here.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}