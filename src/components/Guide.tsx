'use client';

import { withBasePath } from '@/basePath';

// First-run onboarding: the mascot beside a bold, simple 3-step guide.
// Pure presentation — the page owns visibility (first visit + ? button).
export default function Guide({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="pg-guide-overlay" role="dialog" aria-modal="true" aria-label="Welcome to Papagedon">
      <div className="pg-guide-card">
        <img
          src={withBasePath('/onboarding/guide.png')}
          alt="Papagedon guide"
          className="pg-guide-img"
        />
        <div className="pg-guide-body">
          <p className="pg-label">Papagedon AEI</p>
          <h1 className="pg-guide-title">Your AI VJ is ready.</h1>
          <ol className="pg-guide-steps">
            <li>
              <strong>Play music</strong>
              <span>Drop a track anywhere, open the mic, or share system sound.</span>
            </li>
            <li>
              <strong>Pick a look</strong>
              <span>Or leave Automatic on — Muse Spark drives the wall.</span>
            </li>
            <li>
              <strong>Add your flyer</strong>
              <span>The whole show dresses itself for your event.</span>
            </li>
          </ol>
          <button type="button" className="pg-btn pg-btn-primary pg-guide-cta" onClick={onEnter} autoFocus>
            Enter Papagedon
          </button>
        </div>
      </div>
    </div>
  );
}
