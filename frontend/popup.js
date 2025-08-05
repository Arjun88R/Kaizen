document.addEventListener('DOMContentLoaded', function() {
  const trackButton = document.getElementById('trackJobBtn');
  const statusMessage = document.getElementById('statusMessage');
  const dashboardBtn = document.getElementById('dashboardBtn');

  // Update to use your deployed Cloud Function
  const analyzeJobUrl = 'https://us-central1-jacker-c269b.cloudfunctions.net/analyseJobPosting';
  
  trackButton.addEventListener('click', function() {
    statusMessage.textContent = 'Analyzing...';
    trackButton.disabled = true;

    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      const currentTab = tabs[0];
      if (currentTab && currentTab.url) {
        
        // Enhanced request with better error handling
        fetch(analyzeJobUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            url: currentTab.url,
            title: currentTab.title,
            timestamp: new Date().toISOString()
          })
        })
        .then(response => {
          console.log('Response status:', response.status);
          console.log('Response headers:', response.headers);
          
          if (!response.ok) {
            return response.text().then(text => {
              console.error('Error response body:', text);
              throw new Error(`HTTP error! status: ${response.status}, body: ${text}`);
            });
          }
          return response.json();
        })
        .then(data => {
          console.log("Success! Data from function:", data);
          statusMessage.textContent = `Successfully Tracked!`;
          updateStats();
        })
        .catch(error => {
          console.error('Full error details:', error);
          statusMessage.textContent = `Error: ${error.message}`;
        })
        .finally(() => {
          trackButton.disabled = false;
        });

      } else {
         statusMessage.textContent = "Error: Could not get URL.";
         trackButton.disabled = false;
      }
    });
  });

  // Dashboard button
  dashboardBtn.addEventListener('click', function() {
      chrome.tabs.create({ url: 'https://jacker-c269b.web.app' });
  });
  
  // Update stats function
  function updateStats() {
    const getJobsUrl = 'https://us-central1-jacker-c269b.cloudfunctions.net/getJobs';
    
    fetch(getJobsUrl)
      .then(response => response.json())
      .then(data => {
        if (data.jobs) {
          const totalJobs = data.jobs.length;
          const today = new Date().toDateString();
          const todayJobs = data.jobs.filter(job => {
            if (job.trackedAt) {
              const jobDate = job.trackedAt.toDate ? job.trackedAt.toDate() : new Date(job.trackedAt);
              return jobDate.toDateString() === today;
            }
            return false;
          }).length;
          
          document.getElementById('totalJobs').textContent = totalJobs;
          document.getElementById('todayJobs').textContent = todayJobs;
        }
      })
      .catch(error => {
        console.error('Error updating stats:', error);
      });
  }
  
  // Load stats when popup opens
  updateStats();
});