// --- DATA & STATE (Config) ---
const defaultClubs = [
    { name: "60 Degree", default: 70 },
    { name: "52 Degree", default: 110 },
    { name: "Pitching Wedge", default: 125 },
    { name: "9 Iron", default: 140 },
    { name: "8 Iron", default: 155 },
    { name: "7 Iron", default: 170 },
    { name: "6 Iron", default: 185 },
    { name: "5 Iron", default: 200 },
    { name: "4 Iron", default: 215 },
    { name: "4 Hybrid", default: 220 },
    { name: "3 Wood", default: 235 },
    { name: "Driver", default: 285 }
];

const course = [
    { hole: 1, par: 4, dist: 380 },
    { hole: 2, par: 5, dist: 510 },
    { hole: 3, par: 3, dist: 165 },
    { hole: 4, par: 4, dist: 400 },
    { hole: 5, par: 4, dist: 390 },
    { hole: 6, par: 3, dist: 185 },
    { hole: 7, par: 4, dist: 420 },
    { hole: 8, par: 5, dist: 535 },
    { hole: 9, par: 4, dist: 410 }
]; // Total Par 36

let myClubs = [];
let currentHoleIndex = 0;
let distanceToPin = 0;
let holeStartDist = 0;
let strokesThisHole = 0;
let totalScoreVsPar = 0;

// --- INITIALIZATION ---
window.onload = () => {
    const clubInputsDiv = document.getElementById('club-inputs');
    defaultClubs.forEach((club, index) => {
        clubInputsDiv.innerHTML += `
            <div class="config-item">
                <span>${club.name}</span>
                <input type="number" id="club-${index}" value="${club.default}">
            </div>
        `;
    });
};

function startGame() {
    // Save club configs
    myClubs = [];
    defaultClubs.forEach((club, index) => {
        const dist = parseInt(document.getElementById(`club-${index}`).value) || club.default;
        myClubs.push({ name: club.name, distance: dist });
    });
    
    // Populate Dropdown
    const clubSelect = document.getElementById('club-select');
    clubSelect.innerHTML = '';
    myClubs.forEach((club, index) => {
        clubSelect.innerHTML += `<option value="${index}">${club.name} (${club.distance}y)</option>`;
    });

    // Swap Screens
    document.getElementById('config-screen').classList.add('hidden');
    document.getElementById('play-screen').classList.remove('hidden');

    loadHole(0);
}

function loadHole(index) {
    if (index >= course.length) {
        alert(`Round Complete! Final Score: ${formatScore(totalScoreVsPar)}`);
        location.reload(); // Restart completely
        return;
    }
    
    currentHoleIndex = index;
    strokesThisHole = 0;
    const holeData = course[currentHoleIndex];
    distanceToPin = holeData.dist;
    holeStartDist = holeData.dist;

    // Reset UI
    document.getElementById('hole-info').innerText = `Hole ${holeData.hole}`;
    document.getElementById('par-info').innerText = `Par ${holeData.par}`;
    document.getElementById('score-info').innerText = formatScore(totalScoreVsPar);
    
    // Reset Inputs to Straight / Perfect
    document.getElementById('dir3').checked = true;
    document.getElementById('con1').checked = true;
    document.getElementById('shot-log').innerHTML = `Teeing off on Hole ${holeData.hole}...`;

    updateUI();
}

function autoSelectClub() {
    const clubSelect = document.getElementById('club-select');
    let selectedIndex = myClubs.length - 1; // Default to Driver
    
    // Find the club that goes closest to the remaining distance
    for (let i = 0; i < myClubs.length; i++) {
        if (myClubs[i].distance >= distanceToPin) {
            selectedIndex = i;
            break;
        }
    }
    clubSelect.value = selectedIndex;
}

function formatScore(score) {
    if (score === 0) return "E";
    if (score > 0) return `+${score}`;
    return score.toString();
}

function updateUI() {
    document.getElementById('distance-display').innerText = distanceToPin + "y";
    autoSelectClub();
    
    // Update Ball Visualization
    const percentCovered = ((holeStartDist - distanceToPin) / holeStartDist) * 100;
    let visualPercent = Math.max(0, Math.min(percentCovered, 95));
    document.getElementById('ball-icon').style.left = visualPercent + '%';
}

function hitShot() {
    strokesThisHole++;
    
    // Get selections
    const clubIndex = document.getElementById('club-select').value;
    const clubDist = myClubs[clubIndex].distance;
    const clubName = myClubs[clubIndex].name;
    
    const direction = document.querySelector('input[name="direction"]:checked').value;
    const contact = document.querySelector('input[name="contact"]:checked').value;

    // --- MATH ENGINE ---
    let contactMod = 1.0;
    if (contact === 'good') contactMod = 0.90;
    if (contact === 'subpar') contactMod = 0.70;
    if (contact === 'terrible') contactMod = 0.40;
    if (contact === 'topped') contactMod = 0.15;

    let dirMod = 1.0;
    if (direction === 'slight-left' || direction === 'slight-right') dirMod = 0.95;
    if (direction === 'way-left' || direction === 'way-right') dirMod = 0.80;

    // Calculate shot
    let shotDistance = Math.round(clubDist * contactMod * dirMod);
    
    let newDist = Math.abs(distanceToPin - shotDistance);
    
    const logEntry = `Shot ${strokesThisHole}: ${clubName}. Hit ${shotDistance}y. <br>`;
    document.getElementById('shot-log').innerHTML = logEntry + document.getElementById('shot-log').innerHTML;

    distanceToPin = newDist;
    updateUI();

    // Check if on green
    if (distanceToPin <= 20) {
        handleGreen();
    }
}

function handleGreen() {
    // Auto-putt logic based on proximity
    let putts = 2;
    if (distanceToPin <= 3) putts = 1;
    if (distanceToPin > 15) putts = 3;
    
    strokesThisHole += putts;
    
    const holeData = course[currentHoleIndex];
    const scoreThisHole = strokesThisHole - holeData.par;
    totalScoreVsPar += scoreThisHole;

    let popupMsg = `You reached the green!\n\nDistance: ${distanceToPin}y\nPutts taken: ${putts}\n\nTotal Strokes: ${strokesThisHole} (Par ${holeData.par})`;
    
    setTimeout(() => {
        alert(popupMsg);
        loadHole(currentHoleIndex + 1);
    }, 300);
}
