// --- DATA & STATE ---
const brandonClubs = [
    { name: "60 Degree", default: 70 }, { name: "52 Degree", default: 110 },
    { name: "Pitching Wedge", default: 125 }, { name: "9 Iron", default: 140 },
    { name: "8 Iron", default: 155 }, { name: "7 Iron", default: 170 },
    { name: "6 Iron", default: 185 }, { name: "5 Iron", default: 200 },
    { name: "4 Iron", default: 215 }, { name: "4 Hybrid", default: 220 },
    { name: "3 Wood", default: 235 }, { name: "Driver", default: 285 }
];

const tylerClubs = [
    { name: "Sand Wedge", default: 90 }, { name: "Pitching Wedge", default: 110 },
    { name: "9 Iron", default: 130 }, { name: "8 Iron", default: 145 },
    { name: "7 Iron", default: 160 }, { name: "6 Iron", default: 170 },
    { name: "5 Iron", default: 180 }, { name: "4 Iron", default: 190 },
    { name: "3 Wood", default: 200 }, { name: "Driver", default: 240 }
];

const baseCourse = [
    { par: 4, dist: 380 }, { par: 5, dist: 510 },
    { par: 3, dist: 165 }, { par: 4, dist: 400 },
    { par: 4, dist: 390 }, { par: 3, dist: 185 },
    { par: 4, dist: 420 }, { par: 5, dist: 535 },
    { par: 4, dist: 410 }
]; 

let myClubs = [];
let activeCourse = []; 
let currentHoleIndex = 0;
let distanceToPin = 0;
let holeStartDist = 0;
let strokesThisHole = 0;
let totalScoreVsPar = 0;

let obstaclesEnabled = false;
let currentHazard = 'none'; 

// --- INITIALIZATION ---
window.onload = () => {
    loadProfileClubs();
    loadLeaderboard();
};

function loadProfileClubs() {
    const profile = document.getElementById('profile-select').value;
    const clubInputsDiv = document.getElementById('club-inputs');
    clubInputsDiv.innerHTML = '';
    
    const clubsToLoad = (profile === 'brandon') ? brandonClubs : tylerClubs;
    
    clubsToLoad.forEach((club, index) => {
        clubInputsDiv.innerHTML += `
            <div class="config-item">
                <span>${club.name}</span>
                <input type="number" id="club-${index}" value="${club.default}">
            </div>
        `;
    });

    const disableDriverCheckbox = document.getElementById('disable-driver');
    const disable3WoodCheckbox = document.getElementById('disable-3wood');
    
    if (disableDriverCheckbox && disable3WoodCheckbox) {
        if (profile === 'brandon') {
            disableDriverCheckbox.checked = true;
            disable3WoodCheckbox.checked = true;
        } else if (profile === 'tyler') {
            disableDriverCheckbox.checked = false;
            disable3WoodCheckbox.checked = false;
        }
    }
}

// --- LEADERBOARD LOGIC ---
function loadLeaderboard() {
    const tbody = document.querySelector('#leaderboard-table tbody');
    if (!tbody) return;
    
    let leaderboard = JSON.parse(localStorage.getItem('golfLeaderboard')) || [];
    tbody.innerHTML = '';
    
    if (leaderboard.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="color: #aaa;">No rounds completed yet.</td></tr>';
        return;
    }
    
    leaderboard.forEach(entry => {
        tbody.innerHTML += `<tr>
            <td>
                <strong>${entry.title}</strong><br>
                <span style="font-size: 0.8em; color: #aaa;">${entry.date}</span>
            </td>
            <td>${entry.mode}</td>
            <td style="font-size: 1.2em; font-weight: bold; color: ${(entry.rawScore > 0) ? '#ff5252' : (entry.rawScore < 0) ? '#69f0ae' : '#fff'};">${entry.scoreStr}</td>
        </tr>`;
    });
}

function saveToLeaderboard(titleInput, scoreStr, rawScore) {
    const modeSelect = document.getElementById('round-length');
    const mode = modeSelect.options[modeSelect.selectedIndex].text;
    
    let leaderboard = JSON.parse(localStorage.getItem('golfLeaderboard')) || [];
    
    leaderboard.push({
        title: titleInput,
        mode: mode,
        scoreStr: scoreStr,
        rawScore: rawScore,
        date: new Date().toLocaleDateString()
    });
    
    leaderboard.sort((a, b) => a.rawScore - b.rawScore);
    
    localStorage.setItem('golfLeaderboard', JSON.stringify(leaderboard));
}

function clearLeaderboard() {
    if (confirm("Are you sure you want to clear the entire leaderboard?")) {
        localStorage.removeItem('golfLeaderboard');
        loadLeaderboard();
    }
}

function shuffleArray(array) {
    let shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function startGame() {
    myClubs = [];
    const profile = document.getElementById('profile-select').value;
    const clubsToLoad = (profile === 'brandon') ? brandonClubs : tylerClubs;

    const disableDriver = document.getElementById('disable-driver').checked;
    const disable3Wood = document.getElementById('disable-3wood').checked;

    clubsToLoad.forEach((club, index) => {
        if (disableDriver && club.name === "Driver") return; 
        if (disable3Wood && club.name === "3 Wood") return; 
        
        const distInput = document.getElementById(`club-${index}`);
        const dist = distInput ? (parseInt(distInput.value) || club.default) : club.default;
        myClubs.push({ name: club.name, distance: dist });
    });

    const roundMode = document.getElementById('round-length').value;
    const roundLength = roundMode.startsWith('18') ? 18 : 9;
    obstaclesEnabled = roundMode.includes('obstacles');
    activeCourse = [];

    let front9 = shuffleArray(baseCourse);
    front9.forEach((holeData, index) => {
        activeCourse.push({ hole: index + 1, par: holeData.par, dist: holeData.dist });
    });

    if (roundLength === 18) {
        let back9 = shuffleArray(baseCourse);
        back9.forEach((holeData, index) => {
            activeCourse.push({ hole: index + 10, par: holeData.par, dist: holeData.dist });
        });
    }
    
    document.getElementById('config-screen').classList.add('hidden');
    document.getElementById('play-screen').classList.remove('hidden');

    loadHole(0);
}

function loadHole(index) {
    if (index >= activeCourse.length) {
        const finalScoreStr = formatScore(totalScoreVsPar);
        
        let titleInput = prompt(`Round Complete!\nFinal Score: ${finalScoreStr}\n\nEnter a title or note to save to the leaderboard (e.g., Name, Date, Conditions):`);
        
        if (!titleInput || titleInput.trim() === "") {
            titleInput = "Anonymous Round";
        }
        
        saveToLeaderboard(titleInput.trim(), finalScoreStr, totalScoreVsPar);
        location.reload(); 
        return;
    }
    
    currentHoleIndex = index;
    strokesThisHole = 0;
    currentHazard = 'none'; 
    distanceToPin = activeCourse[currentHoleIndex].dist;
    holeStartDist = activeCourse[currentHoleIndex].dist;

    document.getElementById('hole-info').innerText = `Hole ${activeCourse[currentHoleIndex].hole} of ${activeCourse.length}`;
    document.getElementById('par-info').innerText = `Par ${activeCourse[currentHoleIndex].par}`;
    document.getElementById('score-info').innerText = formatScore(totalScoreVsPar);
    document.getElementById('shot-log').innerHTML = `Teeing off on Hole ${activeCourse[currentHoleIndex].hole}...`;

    updateUI();
}

function updateUI() {
    document.getElementById('distance-display').innerText = distanceToPin + "y";
    
    const hazardDisplay = document.getElementById('hazard-display');
    if (currentHazard === 'bunker') {
        hazardDisplay.innerHTML = '<span style="color: #ffa726;">⚠️ In Bunker</span>';
    } else if (currentHazard === 'tree') {
        hazardDisplay.innerHTML = '<span style="color: #66bb6a;">🌲 Behind Trees</span>';
    } else {
        hazardDisplay.innerHTML = '';
    }
    
    const clubSelect = document.getElementById('club-select');
    clubSelect.innerHTML = '';
    let selectedIndex = myClubs.length - 1; 
    
    for (let i = 0; i < myClubs.length; i++) {
        clubSelect.innerHTML += `<option value="${i}">${myClubs[i].name} (${myClubs[i].distance}y)</option>`;
        if (myClubs[i].distance >= distanceToPin && selectedIndex === myClubs.length - 1) {
            selectedIndex = i;
        }
    }
    clubSelect.value = selectedIndex;

    clubSelect.onchange = () => {
        renderContactMenu();
        updateTargetPercentageDisplay();
    };

    renderContactMenu();
    updateTargetPercentageDisplay();
    
    const percentCovered = ((holeStartDist - distanceToPin) / holeStartDist) * 100;
    let visualPercent = Math.max(0, Math.min(percentCovered, 95));
    document.getElementById('ball-icon').style.left = visualPercent + '%';

    document.getElementById('dir0').checked = true;
}

function renderContactMenu() {
    const container = document.getElementById('contact-container');
    const clubSelect = document.getElementById('club-select');
    
    if (!clubSelect || clubSelect.value === "") return;

    const clubIndex = clubSelect.value;
    const clubDist = myClubs[clubIndex].distance;

    if (currentHazard === 'tree') {
        container.innerHTML = `
            <div class="radio-group vertical">
                <input type="radio" id="tree1" name="contact" value="tree-hard"><label class="color-red" for="tree1">Bump & Run - Hard</label>
                <input type="radio" id="tree2" name="contact" value="tree-perfect" checked><label class="color-green" for="tree2">Bump & Run - Perfect</label>
                <input type="radio" id="tree3" name="contact" value="tree-soft"><label class="color-orange" for="tree3">Bump & Run - Soft</label>
            </div>
        `;
    } else if (distanceToPin < clubDist) {
        container.innerHTML = `
            <div class="radio-group vertical">
                <input type="radio" id="chip1" name="contact" value="way-long"><label class="color-red" for="chip1">Way Too Long</label>
                <input type="radio" id="chip2" name="contact" value="long"><label class="color-orange" for="chip2">Too Long</label>
                <input type="radio" id="chip3" name="contact" value="slight-long"><label class="color-yellow" for="chip3">Slightly Long</label>
                <input type="radio" id="chip4" name="contact" value="perfect" checked><label class="color-green" for="chip4">Perfect</label>
                <input type="radio" id="chip5" name="contact" value="slight-short"><label class="color-yellow" for="chip5">Slightly Short</label>
                <input type="radio" id="chip6" name="contact" value="short"><label class="color-orange" for="chip6">Too Short</label>
                <input type="radio" id="chip7" name="contact" value="way-short"><label class="color-red" for="chip7">Way Too Short</label>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="radio-group vertical">
                <input type="radio" id="con1" name="contact" value="perfect" checked><label class="color-green" for="con1">Perfect Contact</label>
                <input type="radio" id="con2" name="contact" value="good"><label class="color-yellow" for="con2">Good Contact</label>
                <input type="radio" id="con3" name="contact" value="subpar"><label class="color-orange" for="con3">Subpar Contact</label>
                <input type="radio" id="con4" name="contact" value="terrible"><label class="color-red" for="con4">Terrible Contact</label>
            </div>
        `;
    }
}

function updateTargetPercentageDisplay() {
    const clubSelect = document.getElementById('club-select');
    const displayEl = document.getElementById('target-power-display');
    if (!clubSelect || !displayEl || clubSelect.value === "") return;

    const clubIndex = clubSelect.value;
    const clubDist = myClubs[clubIndex].distance;

    if (currentHazard === 'tree') {
        displayEl.innerText = `Forced Bump & Run Punch Out`;
    } else if (distanceToPin < clubDist) {
        const targetPercent = Math.round((distanceToPin / clubDist) * 100);
        displayEl.innerText = `Target Swing Power: ${targetPercent}%`;
    } else {
        displayEl.innerText = "";
    }
}

function formatScore(score) {
    if (score === 0) return "E";
    if (score > 0) return `+${score}`;
    return score.toString();
}

function hitShot() {
    strokesThisHole++;
    
    const clubIndex = document.getElementById('club-select').value;
    const clubDist = myClubs[clubIndex].distance;
    const clubName = myClubs[clubIndex].name;
    
    const directionTier = parseInt(document.querySelector('input[name="direction"]:checked').value);
    const contact = document.querySelector('input[name="contact"]:checked').value;
    
    const startingDistanceOfShot = distanceToPin;
    const isPartialShot = distanceToPin < clubDist;
    const previousHazard = currentHazard; 

    // --- 2D GEOMETRY MATH ENGINE ---
    let angleDegrees = 0;
    const absDir = Math.abs(directionTier);
    
    if (absDir === 1) {
        angleDegrees = 10 + (Math.random() * 8 - 4); 
    } 
    else if (absDir === 2) {
        angleDegrees = 20 + (Math.random() * 8 - 4); 
    } 
    else if (absDir === 3) {
        angleDegrees = 30 + (Math.random() * 8 - 4); 
    }
    
    angleDegrees = Math.round(angleDegrees * 10) / 10;
    const angleRadians = angleDegrees * (Math.PI / 180);

    let rawShotDistance = 0;

    if (currentHazard === 'tree') {
        let powerMod = 0.25; 
        if (contact === 'tree-hard') powerMod = 0.45;
        if (contact === 'tree-soft') powerMod = 0.10;
        
        rawShotDistance = Math.round(clubDist * powerMod);
    } 
    else if (isPartialShot) {
        let powerMod = 1.0;
        if (contact === 'way-long') powerMod = 1.60;
        if (contact === 'long') powerMod = 1.30;
        if (contact === 'slight-long') powerMod = 1.10;
        if (contact === 'slight-short') powerMod = 0.85;
        if (contact === 'short') powerMod = 0.60;
        if (contact === 'way-short') powerMod = 0.35;

        rawShotDistance = Math.round(distanceToPin * powerMod);
    } else {
        let contactMod = 1.0;
        
        if (contact === 'perfect') {
            contactMod = 0.98 + (Math.random() * 0.04); 
        } 
        else if (contact === 'good') {
            contactMod = 0.80 + ((Math.random() + Math.random()) * 0.10);
        } 
        else if (contact === 'subpar') {
            contactMod = 0.60 + (Math.random() * 0.20);
        } 
        else if (contact === 'terrible') {
            contactMod = 0.20 + (Math.random() * 0.30);
        }

        rawShotDistance = Math.round(clubDist * contactMod);
    }

    if (currentHazard === 'bunker' && contact !== 'perfect') {
        let bunkerPenalty = 0.40 + (Math.random() * 0.40);
        rawShotDistance = Math.round(rawShotDistance * bunkerPenalty);
    }
    
    let newDistSquared = Math.pow(distanceToPin, 2) + Math.pow(rawShotDistance, 2) - (2 * distanceToPin * rawShotDistance * Math.cos(angleRadians));
    distanceToPin = Math.round(Math.sqrt(newDistSquared));
    
    currentHazard = 'none'; 
    let nextHazardLog = "";

    if (obstaclesEnabled && distanceToPin > 15 && absDir > 0) {
        let hazardChance = 0;
        if (absDir === 1) hazardChance = 0.15; 
        else if (absDir === 2) hazardChance = 0.40; 
        else if (absDir === 3) hazardChance = 0.70; 

        if (Math.random() < hazardChance) {
            currentHazard = (Math.random() < 0.5) ? 'bunker' : 'tree';
            if (currentHazard === 'bunker') nextHazardLog = " ⚠️ Dropped into a bunker!";
            if (currentHazard === 'tree') nextHazardLog = " 🌲 Landed behind a tree!";
        }
    }

    let modeString = isPartialShot ? "Controlled" : "Swung";
    if (previousHazard === 'tree') modeString = "Punched out";
    
    let preHazardLog = "";
    if (previousHazard === 'bunker') preHazardLog = " (From Bunker)";

    const logEntry = `Shot ${strokesThisHole}: ${clubName}. ${modeString} ${rawShotDistance}y (Offline angle: ${angleDegrees}°)${preHazardLog}.${nextHazardLog} <br>`;
    document.getElementById('shot-log').innerHTML = logEntry + document.getElementById('shot-log').innerHTML;

    updateUI();

    if (distanceToPin <= 15) {
        const eligibleForOnePutt = startingDistanceOfShot < 30;
        handleGreen(eligibleForOnePutt);
    }
}

function handleGreen(eligibleForOnePutt) {
    let putts = (distanceToPin <= 1 && eligibleForOnePutt) ? 1 : 2;
    
    strokesThisHole += putts;
    const scoreThisHole = strokesThisHole - activeCourse[currentHoleIndex].par;
    totalScoreVsPar += scoreThisHole;

    let popupMsg = `You reached the green!\n\nDistance remaining: ${distanceToPin}y\nPutts taken: ${putts}\n\nTotal Strokes: ${strokesThisHole} (Par ${activeCourse[currentHoleIndex].par})`;
    
    setTimeout(() => {
        alert(popupMsg);
        loadHole(currentHoleIndex + 1);
    }, 300);
}
