import "./Footer.css";

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-brand">
          <img src="/logo.png" alt="HireX logo" className="footer-logo-image" />
          <span className="footer-logo-text">HireX</span>
        </div>
        <p>© {new Date().getFullYear()} HireX. All rights reserved.</p>
      </div>
    </footer>
  );
}

export default Footer;
