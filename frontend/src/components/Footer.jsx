import "./Footer.css";

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <p>© {new Date().getFullYear()} HireX. All rights reserved.</p>
      </div>
    </footer>
  );
}

export default Footer;
