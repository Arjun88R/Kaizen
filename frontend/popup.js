document.addEventListener('DOMContentLoaded', function() {
  const trackButton = document.getElementById('trackJobBtn');
  const statusMessage = document.getElementById('statusMessage');
  const dashboardBtn = document.getElementById('dashboardBtn');

  // --- IMPORTANT: PASTE YOUR CLOUD FUNCTION URL HERE ---
  const your_cloud_function_url = 'https://analysejobposting-nns3x5vgxa-uc.a.run.app';

  trackButton.addEventListener('click', function() {
    statusMessage.textContent = 'Analyzing...';
    trackButton.disabled = true;

    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      const currentTab = tabs[0];
      if (currentTab && currentTab.url) {
        
        // Construct the full API URL with the job page URL as a parameter
        const apiUrl = `${your_cloud_function_url}?url=${encodeURIComponent(currentTab.url)}`;
        
        // Call your backend!
        fetch(apiUrl)
          .then(response => {
            if (!response.ok) {
              throw new Error(`Network response was not ok`);
            }
            return response.json();
          })
          .then(data => {
            console.log("Data from AI:", data);
            statusMessage.textContent = `Successfully Tracked!`;
            // In a full app, you would now save this 'data' object to Firestore
          })
          .catch(error => {
            console.error('Error tracking job:', error);
            statusMessage.textContent = "Error: Could not track.";
          });

      } else {
         statusMessage.textContent = "Error: Could not get URL.";
      }
    });
  });

  // Add dashboard button click handler
  dashboardBtn.addEventListener('click', function() {
      chrome.tabs.create({ url: 'https://jacker-c269b.web.app' });
  });
  
  // Add click animation to stats
  document.querySelectorAll('.stat-card').forEach(card => {
      card.addEventListener('click', function() {
          this.style.transform = 'translate(3px, 3px)';
          setTimeout(() => {
              this.style.transform = 'translate(0, 0)';
          }, 150);
      });
  });
});

function openDashboard() {
    chrome.tabs.create({ url:'https://jacker-c269b.web.app'});
}