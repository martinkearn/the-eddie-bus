export default function Home() {
  return (
    <main>
      <div className="header">
        <img className="logo" src="/logo.png" alt="The EDDIE Bus logo" />
        <h1>The EDDIE Bus</h1>
      </div>
      <p className="lede">Everyday Drives for Disabled, Independent and Elderly</p>
      <p>Our new website is currently being built. In the meantime, please use the contact details below.</p>

      <div className="panel">
        <ul>
          <li><strong>Charity:</strong> The Bromsgrove Minibus Appeal Fund (Registered Charity 516666)</li>
          <li><strong>Email:</strong> <a href="mailto:theeddiebus@gmail.com">theeddiebus@gmail.com</a></li>
          <li><strong>Phone:</strong> <a href="tel:+447805400180">07805 400180</a></li>
        </ul>
      </div>

      <div className="grid">
        <section className="card" aria-labelledby="about-title">
          <h2 id="about-title">About Us</h2>
          <p>Bromsgrove Minibus Appeal was established as a charity in 1985. Since then, we have provided transport for care homes and specialist groups in the Bromsgrove area.</p>
          <p>We are run by a team of volunteer drivers and trustees.</p>
        </section>

        <section className="card" aria-labelledby="contact-title">
          <h2 id="contact-title">Get In Touch</h2>
          <p>If you are interested in becoming a volunteer driver, or would like to enquire about an outing for your group, we would love to hear from you.</p>
        </section>
      </div>

      <div className="actions">
        <a className="button button-primary" href="tel:+447805400180">Call Us</a>
        <a className="button button-secondary" href="mailto:theeddiebus@gmail.com">Email Us</a>
      </div>

      <small>Serving care homes and specialist groups in the Bromsgrove area since 1985.</small>

      <small>Last updated: 12th May 2026 17:20</small>
    </main>
  )
}