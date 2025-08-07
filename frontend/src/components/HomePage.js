import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiTrendingUp, FiUsers, FiUserCheck, FiZap, FiShield, FiBarChart2 } from 'react-icons/fi';
import validlyBanner from '../validly_banner.png';
import { supabase } from '../supabaseClient';
import Navbar from '../reusable/Navbar';
import Footer from '../reusable/Footer';
const HomePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user || null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    return () => { listener?.subscription.unsubscribe(); };
  }, []);

  return (
    <>
      {/* Navigation Bar */}
      <Navbar></Navbar>

      {/* Homepage Content */}
      <div className="homepage-container">
        {/* Homepage Content */}
        <div className="homepage-hero">
          {/* Validly Banner */}
          <div className="validly-banner-container">
            <img src={validlyBanner} alt="Validly Banner" className="validly-banner" />
          </div>
          <h1>
           Validate Your Business Idea<br />In <span className="gradient-text">Minutes</span>, Not Months.
          </h1>
          <p>Validate your crazy startup ideas in real-time to improve growth, deliverability, reduce competition, and take over markets.</p>
          <div className="homepage-hero-buttons">
            <button className="primary" onClick={() => user ? navigate('/validate') : navigate('/signup')}>Get started →</button>
            <button className="secondary" onClick= {() => navigate('/under-construction')}>Learn more →</button>
          </div>
        </div>

        {/* Features Section */}
        <div className="homepage-features-section">
          <h2>Everything You Need To Validate Your Startup</h2>
          <p>Comprehensive validation tools powered by data and market intelligence</p>
          <div className="homepage-features-grid">
            <div className="feature-card">
              <div className="feature-icon"><FiTrendingUp color="#2563eb" /></div>
              <h3>Market Analysis</h3>
              <p>Get comprehensive market research and trend analysis for your startup idea in seconds.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon"><FiUsers color="#16a34a" /></div>
              <h3>Competitor Intelligence</h3>
              <p>Discover your competition, their strengths, weaknesses, and market positioning.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon"><FiUserCheck color="#9333ea" /></div>
              <h3>Target Audience Insights</h3>
              <p>Identify and understand your ideal customers with detailed demographic analysis.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon"><FiZap color="#eab308" /></div>
              <h3>MVP Roadmap</h3>
              <p>Get a prioritized feature list and development roadmap for your minimum viable product.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon"><FiShield color="#dc2626" /></div>
              <h3>Risk Assessment</h3>
              <p>Understand potential challenges and risks before you invest time and money.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon"><FiBarChart2 color="#6366f1" /></div>
              <h3>Validation Score</h3>
              <p>Receive a comprehensive score based on market demand, competition, and feasibility.</p>
            </div>
          </div>
        </div>

      </div>

      {/* Footer */}
     <Footer></Footer>
    </>
  );
};

export default HomePage; 
