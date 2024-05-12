chrome.alarms.onAlarm.addListener((alarm) => {
    let [website] = alarm.name.split('-');
    chrome.browsingData.remove({ origins: [website] }, { cache: true }, () => {
      if (chrome.runtime.lastError) {
        console.error(`Failed to clear cache for ${website}: ${chrome.runtime.lastError}`);
      } else {
        console.log(`Cache cleared for: ${website}`);
        // Send a message to popup.js (or other scripts) if you want to notify about success
        // This will be useful if you want to display a success message in the popup for instance.
        chrome.runtime.sendMessage({ status: 'success', website: website });
      }
    });
  });
  
  // Use a consistent event-driven approach by hooking to the chrome.runtime.onInstalled event
  chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed and background service worker ready to listen for alarms.');
  });
  // Helper function to calculate the time for the next scheduled alarm
  function calculateNextAlarm(time, repeat) {
    const [hours, minutes] = time.split(':').map(Number);
    const now = new Date();
    let nextAlarm = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
  
    // Adjust for repeating alarms
    if (nextAlarm < now) {
      if (repeat === 'day') {
        nextAlarm.setDate(nextAlarm.getDate() + 1);
      } else if (repeat === 'week') {
        nextAlarm.setDate(nextAlarm.getDate() + 7);
      }
    }
  
    return nextAlarm.getTime();
  }
  
  // Listen to messages from popup script, e.g., to reschedule alarms on update
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'reschedule') {
      const { website, time, repeat } = request;
      const nextAlarmTime = calculateNextAlarm(time, repeat);
      chrome.alarms.create(`${website}-${time}`, { when: nextAlarmTime });
      sendResponse({ result: 'Alarm rescheduled' });
    }
  });
  
  // On start, reschedule alarms if they are no longer active
  chrome.runtime.onStartup.addListener(() => {
    chrome.storage.local.get({ scheduledWebsites: [] }, function(data) {
      data.scheduledWebsites.forEach((websiteData) => {
        if (websiteData.repeat !== 'none') {
          const nextAlarmTime = calculateNextAlarm(websiteData.time, websiteData.repeat);
          chrome.alarms.create(`${websiteData.website}-${websiteData.time}`, { when: nextAlarmTime });
        }
      });
    });
  });