import LandingHeader from "../components/LandingHeader";
import LandingFooter from "../components/LandingFooter";
import "./Landing.css";

function Landing() {
  return (
    <div className="landing-page">
      <LandingHeader />

      <main>
        <section id="home" className="hero-section">
          <div className="landing-shell hero-content">
            <h1>
              Hire Smarter. <span>Apply Faster.</span>
            </h1>
            <p>
              Revolutionize your recruitment workflow with AI-driven matching
              that connects the right talent with the right roles in seconds.
            </p>

            <div className="hero-cta">
              <button type="button" className="cta-primary">
                Apply for Jobs
              </button>
              <button type="button" className="cta-secondary">
                Post a Job
              </button>
            </div>

            <div className="hero-glow hero-glow-left" />
            <div className="hero-glow hero-glow-right" />
          </div>
        </section>

        <section id="jobs" className="features-section">
          <div className="landing-shell">
            <div className="features-copy">
              <p className="eyebrow">Capabilities</p>
              <h2>Powerful Features for Modern Teams</h2>
              <p>
                Everything you need to automate your hiring pipeline and find
                top talent without the manual overhead.
              </p>
            </div>

            <div className="features-grid">
              <article className="feature-item">
                <div className="feature-icon">🎯</div>
                <h3>AI Resume Matching</h3>
                <p>
                  Instant candidate-to-job fit scoring using advanced neural
                  networks and semantic analysis.
                </p>
              </article>

              <article className="feature-item">
                <div className="feature-icon">🛡️</div>
                <h3>Automated Screening</h3>
                <p>
                  Save hundreds of hours with intelligent pre-vetting and
                  skills-based assessment automation.
                </p>
              </article>

              <article className="feature-item">
                <div className="feature-icon">🧠</div>
                <h3>Interview Prep</h3>
                <p>
                  AI-generated questions tailored to specific roles and unique
                  candidate backgrounds.
                </p>
              </article>

              <article className="feature-item">
                <div className="feature-icon">📈</div>
                <h3>Talent Analytics</h3>
                <p>
                  Data-driven insights into your hiring pipeline, conversion
                  rates, and recruitment velocity.
                </p>
              </article>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}

export default Landing;
