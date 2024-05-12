document.addEventListener('DOMContentLoaded', function() {
    const clearNowButton = document.getElementById('clearNow');
    const addToScheduleButton = document.getElementById('addToSchedule');
    const websiteInput = document.getElementById('website');
    const scheduleWebsiteInput = document.getElementById('scheduledWebsite');
    const scheduleTimeInput = document.getElementById('scheduleTime');
    const scheduleRepeatSelect = document.getElementById('scheduleRepeat');
    const scheduledList = document.getElementById('scheduledList');

    function clearCookies(domain) {
        chrome.cookies.getAll({ domain }, function(cookies) {
            if (cookies.length === 0) {
                alert(`No cookies found for ${domain}`);
                return;
            }
            cookies.forEach(function(cookie) {
                var cookieDetails = {
                    url: "http" + (cookie.secure ? "s" : "") + "://" + cookie.domain + cookie.path,
                    name: cookie.name
                };
                chrome.cookies.remove(cookieDetails, function(details) {
                    if (!details) {
                        console.error(`Failed to remove cookie: ${cookie.name}`);
                    }
                });
            });
            alert(`Cookies cleared for ${domain}`);
        });
    }

    clearNowButton.addEventListener('click', function() {
        const website = websiteInput.value.trim();
        if (website) {
            try {
                const domain = new URL(website).hostname;
                clearCookies(domain);
            } catch (e) {
                alert('Please enter a valid URL.');
            }
        } else {
            alert('Please enter a website URL.');
        }
    });

    function setAlarmForWebsite(website, time, repeat) {
        const alarmName = `clear-cookies-${website}`;
        const alarmTime = scheduleNextTime(time, repeat).getTime();
        const periodInMinutes = calculatePeriod(repeat);

        chrome.alarms.create(alarmName, {
            when: alarmTime,
            periodInMinutes: periodInMinutes
        });

        saveScheduledWebsite({ website, time, repeat });
    }

    function scheduleNextTime(time, repeat) {
        const [hours, minutes] = time.split(':').map(Number);
        const now = new Date();
        let scheduleTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);

        if (scheduleTime < now) {
            // Schedule for the next interval if the time has already passed for today
            scheduleTime = new Date(scheduleTime.getTime() + (repeat === 'day' ? 86400000 : (repeat === 'week' ? 604800000 : 0)));
        }
        
        return scheduleTime;
    }

    function calculatePeriod(repeat) {
        if (repeat === 'day') {
            return 60 * 24;
        } else if (repeat === 'week') {
            return 60 * 24 * 7;
        } else {
            return null; // no repeat
        }
    }

    addToScheduleButton.addEventListener('click', function() {
        const website = scheduleWebsiteInput.value.trim();
        const time = scheduleTimeInput.value;
        const repeat = scheduleRepeatSelect.value;

        if (website && time) {
            try {
                const domain = new URL(website).hostname; // Validate the URL
                setAlarmForWebsite(domain, time, repeat); // Set the alarm
            } catch (e) {
                alert('Please enter a valid URL.');
            }
        } else {
            alert('Please enter both website URL and time for scheduling.');
        }
    });

    function saveScheduledWebsite(schedule) {
        chrome.storage.local.get({ scheduledWebsites: [] }, function(data) {
            data.scheduledWebsites = data.scheduledWebsites.filter(item => item.website !== schedule.website);
            data.scheduledWebsites.push(schedule);
            chrome.storage.local.set({ scheduledWebsites: data.scheduledWebsites }, updateScheduledListDisplay);
        });
    }

    function updateScheduledListDisplay() {
        scheduledList.innerHTML = '';
        chrome.storage.local.get({ scheduledWebsites: [] }, function(data) {
            data.scheduledWebsites.forEach(function(schedule) {
                const listItem = document.createElement('li');
                listItem.textContent = `${schedule.website} - Clear cookies at ${schedule.time} every ${schedule.repeat !== 'none' ? schedule.repeat : 'once'}`;

                const removeButton = document.createElement('button');
                removeButton.textContent = 'Remove';
                removeButton.className = 'remove-btn';
                removeButton.addEventListener('click', function() {
                    removeScheduledWebsite(schedule.website, schedule.time);
                });

                listItem.appendChild(removeButton);
                scheduledList.appendChild(listItem);
            });
        });
    }

    function removeScheduledWebsite(website, time) {
        chrome.storage.local.get({ scheduledWebsites: [] }, function(data) {
            data.scheduledWebsites = data.scheduledWebsites.filter(item => !(item.website === website && item.time === time));
            chrome.storage.local.set({ scheduledWebsites: data.scheduledWebsites }, function() {
                chrome.alarms.clear(`clear-cookies-${website}`, updateScheduledListDisplay);
            });
        });
    }

    updateScheduledListDisplay();
});