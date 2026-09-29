import Link from 'next/link';

export default function Home() {
  return <>
    <header className="site-header">
      <Link className="brand" href="/"><span className="brand-mark">h</span> hushheron<span style={{ color: 'var(--sea)' }}>.</span></Link>
      <nav className="top-nav"><a href="#how">How it works</a><a href="#privacy">Privacy</a><Link className="button" href="/app">Enter the app <span aria-hidden>↗</span></Link></nav>
    </header>
    <main>
      <section className="landing-hero">
        <div className="hero-copy">
          <div className="eyebrow">A quieter way to be heard</div>
          <h1 className="serif">Honest words.<br /><em>Hidden names.</em></h1>
          <p className="muted">Ask what matters. Hear from the right people. Protect the person behind every answer.</p>
          <div className="hero-actions"><Link className="button" href="/app">Explore surveys <span aria-hidden>↗</span></Link><a className="text-link" href="#how">See how it works ↓</a></div>
        </div>
        <div className="hero-art" aria-label="Abstract HushHeron emblem beneath a moon"><div className="heron" aria-hidden>h</div><div className="art-caption"><span>Private by design</span><span>Powered by Midnight</span></div></div>
      </section>
      <section className="landing-section" id="how"><div className="section-inner">
        <div className="section-heading"><div><div className="eyebrow">Simple for everyone</div><h2 className="serif">Three steps. One honest conversation.</h2></div></div>
        <div className="steps"><div className="step card"><span className="number">01</span><div><h3>Make a space</h3><p className="muted">Write one clear question and decide who may respond.</p></div></div><div className="step card"><span className="number">02</span><div><h3>Prove eligibility</h3><p className="muted">Participants privately prove they were approved, once.</p></div></div><div className="step card"><span className="number">03</span><div><h3>Hear the signal</h3><p className="muted">See verified totals and aggregated answers, never a wallet beside a response.</p></div></div></div>
      </div></section>
      <section className="landing-section" id="privacy"><div className="section-inner">
        <div className="section-heading"><div><div className="eyebrow">The privacy advantage</div><h2 className="serif">Proof where you need it.<br />Quiet where you don’t.</h2></div></div>
        <div className="privacy-grid"><div className="privacy-panel dark"><div className="eyebrow" style={{ color: 'var(--sand)' }}>Kept private</div><h3 className="serif">Behind the veil</h3><ul><li>Participant credential and Merkle path</li><li>Individual answer on the public ledger</li><li>Any wallet-to-answer record in the app</li></ul></div><div className="privacy-panel light"><div className="eyebrow">Publicly verifiable</div><h3 className="serif">In the clear</h3><ul><li>A response came from an approved credential</li><li>The credential was used only once</li><li>The verified response total</li></ul></div></div>
      </div></section>
      <section className="landing-cta"><div className="eyebrow" style={{ color: 'var(--ink)' }}>Start listening differently</div><h2 className="serif">Say more. Reveal less.</h2><Link className="button" href="/app">Enter HushHeron ↗</Link></section>
    </main>
    <footer className="site-header" style={{ fontSize: 12 }}><span>© HushHeron</span><span>Verified feedback without revealing who said it.</span></footer>
  </>;
}
