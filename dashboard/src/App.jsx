import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, orderBy, getDocs, doc, updateDoc } from "firebase/firestore";
import './App.css';

// Your web app's Firebase configuration - using environment variables
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// Validate environment variables are loaded
if (!process.env.REACT_APP_FIREBASE_API_KEY) {
  console.error('Firebase configuration missing. Please check your .env file.');
}

// Initialize Firebase and get a reference to the database
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const STATUS_OPTIONS = ["rejected", "interview", "in progress"];

export default function App() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');

  const filterOptions = ['All', ...STATUS_OPTIONS];

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const jobsCollection = collection(db, 'tracked_jobs');
        const q = query(jobsCollection, orderBy('trackedAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const jobsList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setJobs(jobsList);
      } catch (error) {
        console.error("Error fetching jobs from Firestore: ", error);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

    const handleStatusChange = async (id, newStatus) => {
    setJobs((prevJobs) =>
      prevJobs.map((job) =>
        job.id === id ? { ...job, status: newStatus } : job
      )
    );
    try {
      const jobDocRef = doc(db, 'tracked_jobs', id);
      await updateDoc(jobDocRef, {
        status: newStatus
      });
      console.log("Successfully updated status in Firestore for job:", id);
    } catch (error) {
      console.error("Error updating status in Firestore: ", error);
    }
  };

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
  };

  const filteredJobs = jobs.filter(job => {
    if (activeFilter === 'All') return true;
    return job.status === activeFilter;
  });

  const getStats = () => {
    const totalApps = jobs.length;
    const thisWeek = jobs.filter(job => {
      if (!job.trackedAt) return false;
      const jobDate = job.trackedAt.toDate ? job.trackedAt.toDate() : new Date(job.trackedAt);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return jobDate >= weekAgo;
    }).length;
    const interviews = jobs.filter(job => job.status === 'Interview').length;
    return { totalApps, thisWeek, interviews };
  };

  const stats = getStats();

  const getStatusClass = (status) => {
    if (!status) return 'status';
    switch (status.toLowerCase()) {
      case 'in progress':
        return 'status applied';
      case 'interview':
        return 'status interview';
      case 'rejected':
        return 'status rejected';
      default:
        return 'status';
    }
  };

  const formatDate = (timestamp => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  });

  const truncateUrl = (url, maxLength = 50) => {
    if (!url) return 'N/A';
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + '...';
  };

  // Glitch effect
  useEffect(() => {
    const interval = setInterval(() => {
      const cards = document.querySelectorAll('.job-card');
      if (cards.length > 0) {
        const randomCard = cards[Math.floor(Math.random() * cards.length)];
        randomCard.style.animation = 'glitch 0.3s ease-in-out';
        setTimeout(() => {
          randomCard.style.animation = '';
        }, 300);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [jobs]);

  if (loading) {
    return (
      <div className="container">
        <div className="loading-container">
          <div className="loading-box">
            <div className="loading-text">LOADING TRACKED JOBS...</div>
            <div className="loading-bar">
              <div className="loading-fill"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="header">
        <div className="logo">KAIZEN</div>
        <div className="header-stats">
          <div className="header-stat">
            <div className="stat-number">{stats.totalApps}</div>
            <div className="stat-label">Total Apps</div>
          </div>
          <div className="header-stat">
            <div className="stat-number">{stats.thisWeek}</div>
            <div className="stat-label">This Week</div>
          </div>
          <div className="header-stat">
            <div className="stat-number">{stats.interviews}</div>
            <div className="stat-label">Interviews</div>
          </div>
        </div>
      </header>

      <div className="dashboard-title">
        <h1>Job Application Tracker</h1>
      </div>

      <div className="controls">
        <div className="filter-group">
          {filterOptions.map(filter => (
            <button
              key={filter}
              className={`filter-btn ${activeFilter === filter ? 'active' : ''}`}
              onClick={() => handleFilterChange(filter)}
            >
              {filter}
            </button>
          ))}
        </div>
        <div className="extension-note">
          <span className="note-text">USE EXTENSION TO ADD JOBS</span>
        </div>
      </div>

      {filteredJobs.length > 0 ? (
        <div className="jobs-grid">
          {filteredJobs.map(job => (
            <div key={job.id} className="job-card">
              <div className="job-header">
                <div className="company-name">
                  {job.company || job.companyName || 'UNKNOWN COMPANY'}
                </div>
                <div className="status-dropdown">
                  <select
                    value={job.status || ""}
                    onChange={(e) => handleStatusChange(job.id, e.target.value)}
                    className={getStatusClass(job.status)}
                  >
                    <option value="" disabled>SELECT STATUS</option>
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="job-title">
                {job.job_title || job.jobTitle || 'NO TITLE PROVIDED'}
              </div>
              
              <div className="job-url">
                <a 
                  href={job.originalUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="url-link"
                >
                  {truncateUrl(job.originalUrl)}
                </a>
              </div>
              
              <div className="job-meta">
                <div className="date-applied">
                  TRACKED: {formatDate(job.trackedAt)}
                </div>
                <div className="job-id">
                  ID: {job.id.substring(0, 8).toUpperCase()}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-message">
            {activeFilter === 'All' 
              ? "NO JOBS TRACKED YET. USE THE EXTENSION TO ADD SOME!" 
              : `NO JOBS FOUND FOR "${activeFilter.toUpperCase()}" STATUS`
            }
          </div>
        </div>
      )}

      <footer className="footer">
        <div className="footer-text">KAIZEN - CONTINUOUS JOB GROWTH</div>
      </footer>
    </div>
  );
}