function LandingFooter() {
  return (
    <footer className="landing-footer">
      <div className="landing-shell">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="brand">
              <img src="/logo.jpg" alt="HireX logo" className="brand-logo" />
              <span className="brand-text">Hire<span>X</span></span>
            </div>
            <p>
              The next generation of recruitment. Empowering teams to find and
              hire the best talent through ethical AI.
            </p>
            <div className="footer-socials" aria-label="Social links">
              <a href="#" aria-label="LinkedIn">
                <i className="fa-brands fa-linkedin-in" />
              </a>
              <a href="#" aria-label="Twitter / X">
                <i className="fa-brands fa-x-twitter" />
              </a>
              <a href="#" aria-label="Instagram">
                <i className="fa-brands fa-instagram" />
              </a>
              <a href="#" aria-label="Email">
                <i className="fa-solid fa-envelope" />
              </a>
            </div>
          </div>

          <div>
            <h4>Product</h4>
            <ul>
              <li><a href="#"><i className="fa-solid fa-star" /> Features</a></li>
              <li><a href="#"><i className="fa-solid fa-plug" /> Integrations</a></li>
              <li><a href="#"><i className="fa-solid fa-building" /> Enterprise</a></li>
            </ul>
          </div>

          <div>
            <h4>Resources</h4>
            <ul>
              <li><a href="#"><i className="fa-solid fa-book" /> Documentation</a></li>
              <li><a href="#"><i className="fa-solid fa-code" /> API Reference</a></li>
              <li><a href="#"><i className="fa-solid fa-briefcase" /> Case Studies</a></li>
              <li><a href="#"><i className="fa-solid fa-rss" /> Blog</a></li>
            </ul>
          </div>

          <div>
            <h4>Company</h4>
            <ul>
              <li><a href="#"><i className="fa-solid fa-circle-info" /> About</a></li>
              <li><a href="#"><i className="fa-solid fa-user-tie" /> Careers</a></li>
              <li><a href="#"><i className="fa-solid fa-shield" /> Privacy</a></li>
              <li><a href="#"><i className="fa-solid fa-file-lines" /> Terms</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© 2024 HireX Inc. All rights reserved.</p>
          <div>
            <a href="#"><i className="fa-solid fa-circle-dot" /> Status</a>
            <a href="#"><i className="fa-solid fa-headset" /> Contact Support</a>
            <button type="button"><i className="fa-solid fa-globe" /> English (US)</button>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default LandingFooter;