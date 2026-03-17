import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import LandingHeader from "../components/LandingHeader";
import LandingFooter from "../components/LandingFooter";
import "./Landing.css";

const PHOTOS = {
  hero: "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=900&q=85&auto=format&fit=crop",

  t1: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&q=80&auto=format&fit=crop&crop=face",
  t2: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80&auto=format&fit=crop&crop=face",
  t3: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=100&q=80&auto=format&fit=crop&crop=face",
};

function Landing() {
  const { hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const el = document.querySelector(hash);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  }, [hash]);

  return (
    <div className="landing-page">
      <LandingHeader />

      <main>
        {/* ── HERO ── */}
        <section id="home" className="hero-section">
          <div className="landing-shell hero-inner">

            {/* Left: text */}
            <div className="hero-content">
              <div className="hero-badge">
                <i className="fa-solid fa-bolt" />
                AI-Powered Recruitment Platform
              </div>

              <h1>
                Hire Smarter.<br />
                <em>Apply Faster.</em>
              </h1>

              <p>
                Revolutionize your recruitment workflow with AI-driven matching
                that connects the right talent with the right roles in seconds.
              </p>

              <div className="hero-cta">
                <Link to="/candidate/jobs" className="cta-primary">
                  <i className="fa-solid fa-magnifying-glass" />
                  Find Jobs
                </Link>
                <Link to="/hr/jobs" className="cta-secondary">
                  <i className="fa-regular fa-building" />
                  Post a Job
                </Link>
              </div>

              <div className="hero-stats">
                <div className="stat-item">
                  <span className="stat-num">48K+</span>
                  <span className="stat-label">Active Jobs</span>
                </div>
                <div className="stat-item">
                  <span className="stat-num">12K+</span>
                  <span className="stat-label">Companies</span>
                </div>
                <div className="stat-item">
                  <span className="stat-num">94%</span>
                  <span className="stat-label">Match Accuracy</span>
                </div>
                <div className="stat-item">
                  <span className="stat-num">3.2x</span>
                  <span className="stat-label">Faster Hiring</span>
                </div>
              </div>
            </div>

            {/* Right: single image */}
            <div className="hero-image-wrap">
              <img
                src={PHOTOS.hero}
                alt="Professionals collaborating"
                className="hero-image"
              />

            </div>

            <div className="hero-glow hero-glow-left" />
            <div className="hero-glow hero-glow-right" />
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section id="features" className="features-section">
          <div className="landing-shell">
            <div className="features-header">
              <div className="features-copy">
                <p className="eyebrow">Capabilities</p>
                <h2>Powerful Features for Modern Teams</h2>
                <p>
                  Everything you need to automate your hiring pipeline and find
                  top talent without the manual overhead.
                </p>
              </div>
            </div>

            <div className="features-grid">
              <article className="feature-item">
                <div className="feature-icon">
                  <i className="fa-solid fa-bullseye" />
                </div>
                <h3>AI Resume Matching</h3>
                <p>
                  Instant candidate-to-job fit scoring using advanced neural
                  networks and semantic analysis.
                </p>
              </article>

              <article className="feature-item">
                <div className="feature-icon">
                  <i className="fa-solid fa-shield-halved" />
                </div>
                <h3>Automated Screening</h3>
                <p>
                  Save hundreds of hours with intelligent pre-vetting and
                  skills-based assessment automation.
                </p>
              </article>

              <article className="feature-item">
                <div className="feature-icon">
                  <i className="fa-solid fa-brain" />
                </div>
                <h3>Interview Prep</h3>
                <p>
                  AI-generated questions tailored to specific roles and unique
                  candidate backgrounds.
                </p>
              </article>

              <article className="feature-item">
                <div className="feature-icon">
                  <i className="fa-solid fa-chart-line" />
                </div>
                <h3>Talent Analytics</h3>
                <p>
                  Data-driven insights into your hiring pipeline, conversion
                  rates, and recruitment velocity.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section id="how" className="how-section">
          <div className="landing-shell">
            <div className="how-header">
              <p className="eyebrow">Process</p>
              <h2>Up and Running in Three Steps</h2>
            </div>

            <div className="how-steps">
              <div className="how-step">
                <div className="step-num">1</div>
                <h3>Create Your Profile</h3>
                <p>
                  Upload your resume or post your job listing in under two
                  minutes. Our AI extracts the key signals automatically.
                </p>
              </div>
              <div className="how-step">
                <div className="step-num">2</div>
                <h3>Get Matched Instantly</h3>
                <p>
                  Our matching engine surfaces the best-fit candidates or
                  opportunities with a detailed compatibility score.
                </p>
              </div>
              <div className="how-step">
                <div className="step-num">3</div>
                <h3>Hire with Confidence</h3>
                <p>
                  Schedule interviews, review AI-tailored questions, and make
                  offers — all from a single streamlined dashboard.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── SOCIAL PROOF ── */}
        <section id="testimonials" className="proof-section">
          <div className="landing-shell">
            <div className="proof-header">
              <p className="eyebrow">Testimonials</p>
              <h2>Trusted by Thousands of Teams</h2>
            </div>

            <div className="proof-grid">
              <div className="proof-card">
                <div className="proof-stars">★★★★★</div>
                <blockquote>
                  "We cut our time-to-hire by 60% in the first month. The AI
                  matching is eerily accurate — it surfaces candidates we would
                  have missed entirely."
                </blockquote>
                <div className="proof-author">
                  <img src={PHOTOS.t1} alt="Sarah K." className="proof-avatar" />
                  <div>
                    <span className="proof-author-name">Sarah K.</span>
                    <span className="proof-author-role">Head of Talent, Fintech startup</span>
                  </div>
                </div>
              </div>

              <div className="proof-card">
                <div className="proof-stars">★★★★★</div>
                <blockquote>
                  "As a candidate, the interview prep feature was a game-changer.
                  I walked in knowing exactly what to expect and landed the role."
                </blockquote>
                <div className="proof-author">
                  <img src={PHOTOS.t2} alt="Marcus T." className="proof-avatar" />
                  <div>
                    <span className="proof-author-name">Marcus T.</span>
                    <span className="proof-author-role">Senior Engineer, hired via platform</span>
                  </div>
                </div>
              </div>

              <div className="proof-card">
                <div className="proof-stars">★★★★★</div>
                <blockquote>
                  "The analytics dashboard gave us visibility into bottlenecks we
                  didn't know existed. Our offer acceptance rate jumped to 89%."
                </blockquote>
                <div className="proof-author">
                  <img src={PHOTOS.t3} alt="Priya M." className="proof-avatar" />
                  <div>
                    <span className="proof-author-name">Priya M.</span>
                    <span className="proof-author-role">VP People Ops, Series B company</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}

export default Landing;