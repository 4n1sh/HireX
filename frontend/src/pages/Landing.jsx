import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "./Landing.css";

function Landing() {
  return (
    <>
      <Navbar />

      <section className="hero">
        <div className="hero-container">
          <h1>
            Hire Smarter. <span>Apply Faster.</span>
          </h1>

          <p>
            HireX connects talented candidates with the right companies
            using intelligent matching technology.
          </p>

          <div className="hero-buttons">
            <Link to="/signup" className="btn-primary">
              Get Started
            </Link>

            <Link to="/login" className="btn-secondary">
              Login
            </Link>
          </div>
        </div>
      </section>

      <section className="features">
        <div className="features-container">
          <div className="feature-card">
            <h3>Smart Matching</h3>
            <p>AI-powered matching between companies and candidates.</p>
          </div>

          <div className="feature-card">
            <h3>Fast Applications</h3>
            <p>Apply to jobs in seconds with one-click process.</p>
          </div>

          <div className="feature-card">
            <h3>HR Dashboard</h3>
            <p>Manage applicants and track hiring easily.</p>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}

export default Landing;
