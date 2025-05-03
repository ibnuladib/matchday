const leagueCodes = ["PL", "PD", "BL1", "SA", "FL1"]; // Premier League, La Liga, Bundesliga, Serie A, Ligue 1

const heading = document.getElementById("heading");
const matchInfo = document.getElementById("matchInfo");
const teamSearch = document.getElementById("teamSearch");
const teamSuggestions = document.getElementById("teamSuggestions");
const reselectBtn = document.getElementById("reselectBtn");

let allTeams = [];
let selectedTeamId = null;

// Fetch all teams from the top 5 leagues
async function fetchAllTeams() {
  const teamList = [];
  for (const code of leagueCodes) {
    try {
      const res = await fetch(`https://api.football-data.org/v4/competitions/${code}/teams`, {
        headers: { "X-Auth-Token": API_TOKEN }
      });
      const data = await res.json();
      if (data.teams) {
        data.teams.forEach(team => {
          teamList.push({
            id: team.id,
            name: team.name,
            league: data.competition.name
          });
        });
      }
    } catch (err) {
      console.error(`Failed to fetch teams for ${code}`, err);
    }
  }
  return teamList;
}

// Show next match for the selected team
async function loadMatch(teamId, forceUpdate = false) {
  heading.textContent = "Upcoming Match";
  matchInfo.textContent = "Loading...";

  // Check if match details are already saved and if they are up-to-date
  chrome.storage.local.get([`matchDetails_${teamId}`, `matchTimestamp_${teamId}`], async (data) => {
    const savedMatch = data[`matchDetails_${teamId}`];
    const savedTimestamp = data[`matchTimestamp_${teamId}`];

    // If match details are saved and not forced to update, load from storage
    if (savedMatch && !forceUpdate) {
      const currentDate = new Date();
      const matchDate = new Date(savedMatch.date);
      const timeDifference = currentDate - matchDate;

      // If the saved match is recent enough (e.g., within 24 hours), use it
      if (timeDifference < 86400000) { // 24 hours in milliseconds
        displayMatch(savedMatch);
        return;
      }
    }

    // If no match or outdated, fetch match from API
    try {
      const res = await fetch(`https://api.football-data.org/v4/teams/${teamId}/matches?status=SCHEDULED&limit=1`, {
        headers: { "X-Auth-Token": API_TOKEN }
      });
      const data = await res.json();

      if (!data.matches || data.matches.length === 0) {
        matchInfo.textContent = "No upcoming match.";
        return;
      }

      const match = data.matches[0];
      const date = new Date(match.utcDate).toLocaleString();

      // Save match details and timestamp in local storage
      const matchDetails = {
        homeTeam: match.homeTeam.name,
        awayTeam: match.awayTeam.name,
        competition: match.competition.name,
        date: match.utcDate
      };

      chrome.storage.local.set({
        [`matchDetails_${teamId}`]: matchDetails,
        [`matchTimestamp_${teamId}`]: new Date().toISOString()
      });

      displayMatch(matchDetails);
    } catch (err) {
      console.error("Failed to load match info", err);
      matchInfo.textContent = "Error loading match.";
    }
  });
}

// Display match details to the user
function displayMatch(match) {
  matchInfo.innerHTML = `
    <p><strong>${match.competition}</strong></p>
    ${match.homeTeam} <strong>vs</strong> ${match.awayTeam}<br/>
    <span style="font-size: 12px; color: #555;">Kickoff: ${new Date(match.date).toLocaleString()}</span>
  `;
}

// Handle team search input
function handleTeamSearchInput() {
  const input = teamSearch.value.toLowerCase();
  const filteredTeams = allTeams.filter(t => t.name.toLowerCase().includes(input));

  // Clear previous suggestions
  teamSuggestions.innerHTML = '';

  // Show suggestions
  filteredTeams.forEach(team => {
    const li = document.createElement("li");
    li.textContent = team.name;
    li.addEventListener("click", () => handleTeamSelection(team));
    teamSuggestions.appendChild(li);
  });
}

// Handle team selection
function handleTeamSelection(team) {
  // Save selected team to storage
  chrome.storage.local.set({ selectedTeamId: team.id, selectedTeamName: team.name });
  selectedTeamId = team.id;
  loadMatch(team.id); // Load match for the selected team
  teamSearch.value = team.name;
  teamSuggestions.innerHTML = ''; // Clear suggestions
  reselectBtn.style.display = 'block'; // Show reselect button
}

// Show saved team or prompt for selection
function loadSavedTeam() {
  chrome.storage.local.get(["selectedTeamId", "selectedTeamName"], async (data) => {
    if (data.selectedTeamId && data.selectedTeamName) {
      selectedTeamId = data.selectedTeamId;
      teamSearch.value = data.selectedTeamName;

      // Load match using the saved team ID
      loadMatch(data.selectedTeamId);
      reselectBtn.style.display = 'block'; // Show reselect button
    } else {
      matchInfo.textContent = "Search for a team to see the next match.";
    }
  });
}

// Reselect a team
reselectBtn.addEventListener("click", () => {
  chrome.storage.local.remove(["selectedTeamId", "selectedTeamName"], () => {
    teamSearch.value = '';
    matchInfo.textContent = 'Loading...';
    reselectBtn.style.display = 'none';
    loadSavedTeam(); // Prompt the user to select a new team
  });
});

// Initialize the popup
async function init() {
  // Load teams from storage, fetch them if not saved
  chrome.storage.local.get(["allTeams"], async (data) => {
    if (data.allTeams) {
      allTeams = data.allTeams;
      loadSavedTeam(); // Check if a team is saved and load match info
    } else {
      allTeams = await fetchAllTeams();
      chrome.storage.local.set({ allTeams }); // Save the fetched teams in storage
      loadSavedTeam(); // Check if a team is saved and load match info
    }
  });

  teamSearch.addEventListener("input", handleTeamSearchInput);
}

init();
