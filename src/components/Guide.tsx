'use client';

import { withBasePath } from '@/basePath';

// First-run onboarding: mascot + welcome header up top, the 3 steps in a
// horizontal row, one CTA. Pure presentation — the page owns visibility.
export default function Guide({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="pg-guide-overlay" role="dialog" aria-modal="true" aria-label="Welcome to Papagedon">
      <div className="pg-guide-card">
        <div className="pg-guide-top">
          <img
            src={withBasePath('/onboarding/guide.png')}
            alt="Papagedon guide"
            className="pg-guide-img"
          />
          <div>
            <p className="pg-label">Papagedon AEI</p>
            <h1 className="pg-guide-title">Welcome to Papagedon.</h1>
            <p className="pg-guide-sub">Experience immersion — your AI VJ reads the music and directs the show live.</p>
          </div>
        </div>
        <ol className="pg-guide-steps">
          <li>
            <strong>Play music</strong>
            <span>Drop a track, open the mic, or share system audio.</span>
          </li>
          <li>
            <strong>Stay Automatic</strong>
            <span>Muse Spark picks every scene from the sound.</span>
          </li>
          <li>
            <strong>Add your flyer</strong>
            <span>The show dresses itself for your event.</span>
          </li>
        </ol>
        <button type="button" className="pg-btn pg-btn-primary pg-guide-cta" onClick={onEnter} autoFocus>
          Enter Papagedon
        </button>
      </div>
    </div>
  );
}
