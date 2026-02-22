function LandingFooter() {
  return (
    <footer className="landing-footer">
      <div className="landing-shell">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="brand">
              <img src="/logo.png" alt="HireX logo" className="brand-logo" />
              <span className="brand-text">HireX</span>
            </div>
            <p>
              The next generation of recruitment. Empowering teams to find and
              hire the best talent through ethical AI.
            </p>
            <div className="footer-socials" aria-label="Social links">
              <a href="#" aria-label="Website">
                🌐
              </a>
              <a href="#" aria-label="Email">
                @
              </a>
              <a href="#" aria-label="Share">
                ↗
              </a>
            </div>
          </div>

          <div>
            <h4>Product</h4>
            <ul>
              <li>
                <a href="#">Features</a>
              </li>
              <li>
                <a href="#">Integrations</a>
              </li>
              <li>
                <a href="#">Enterprise</a>
              </li>
            </ul>
          </div>

          <div>
            <h4>Resources</h4>
            <ul>
              <li>
                <a href="#">Documentation</a>
              </li>
              <li>
                <a href="#">API Reference</a>
              </li>
              <li>
                <a href="#">Case Studies</a>
              </li>
              <li>
                <a href="#">Blog</a>
              </li>
            </ul>
          </div>

          <div>
            <h4>Company</h4>
            <ul>
              <li>
                <a href="#">About</a>
              </li>
              <li>
                <a href="#">Careers</a>
              </li>
              <li>
                <a href="#">Privacy</a>
              </li>
              <li>
                <a href="#">Terms</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© 2024 HireX Inc. All rights reserved.</p>
          <div>
            <a href="#">Status</a>
            <a href="#">Contact Support</a>
            <button type="button">🌍 English (US)</button>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default LandingFooter;