// --- DATA & STATE ---
const defaultClubs = [
    { name: "60 Degree", default: 70 }, { name: "52 Degree", default: 110 },
    { name: "Pitching Wedge", default: 125 }, { name: "9 Iron", default: 140 },
    { name: "8 Iron", default: 155 }, { name: "7 Iron", default: 170 },
    { name: "6 Iron", default: 185 }, { name: "5 Iron", default: 200 },
    { name: "4 Iron", default: 215 }, { name: "4 Hybrid", default: 220 },
    { name: "3 Wood", default: 235 }, { name: "Driver", default: 285 }
];

const course = [
    { hole: 1, par: 4, dist: 380 }, { hole: 2, par: 5, dist: 510 },
    { hole: 3, par: 3, dist: 165 }, { hole: 4, par: 4, dist: 400 },
    { hole: 5, par: 4, dist: 390 }, { hole: 6, par: 3, dist: 185 },
    { hole: 7, par: 4, dist: 420 }, { hole: 8, par: 5, dist: 535 },
    { hole: 9, par: 4, dist: 410 }
]; 

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
    myClubs = [];
    const disableDriver = document.getElementById('disable-driver').checked;
    const disable3Wood = document.getElementById('disable-3wood').checked;

    defaultClubs.forEach((club, index) => {
        if (disableDriver && club.name === "Driver") return; 
        if (disable3Wood && club.name === "3 Wood") return; 
        
        const dist = parseInt(document.getElementById(`club-${index}`).value) || club.default;
        myClubs.push({ name: club.name, distance: dist });
    });
    
    document.getElementById('config-screen').classList.add('hidden');
    document.getElementById('play-screen').classList.remove('hidden');

    loadHole(0);
}

function loadHole(index) {
    if (index >= course.length) {
        alert(`Round Complete! Final Score: ${formatScore(totalScoreVsPar)}`);
        location.reload(); 
        return;
    }
    
    currentHoleIndex = index;
    strokesThisHole = 0;
    distanceToPin = course[currentHoleIndex].dist;
    holeStartDist = course[currentHoleIndex].dist;

    document.getElementById('hole-info').innerText = `Hole ${course[currentHoleIndex].hole}`;
    document.getElementById('par-info').innerText = `Par ${course[currentHoleIndex].par}`;
    document.getElementById('score-info').innerText = formatScore(totalScoreVsPar);
    document.getElementById('shot-log').innerHTML = `Teeing off on Hole ${course[currentHoleIndex].hole}...`;

    updateUI();
}

function updateUI() {
    document.getElementById('distance-display').innerText = distanceToPin + "y";
    
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

    renderContactMenu();
    
    const percentCovered = ((holeStartDist - distanceToPin) / holeStartDist) * 100;
    let visualPercent = Math.max(0, Math.min(percentCovered, 95));
    document.getElementById('ball-icon').style.left = visualPercent + '%';

    document.getElementById('dir0').checked = true;
}

function renderContactMenu() {
    const container = document.getElementById('contact-container');
    const minClubDist = myClubs[0].distance;

    if (distanceToPin < minClubDist) {
        // CHIPPING MODE
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
        // FULL SWING MODE
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
    const isChipping = distanceToPin < myClubs[0].distance;

    // --- 2D GEOMETRY MATH ENGINE ---
    // Establish deviation angle based on left/right selection
    let angleDegrees = 0;
    const absDir = Math.abs(directionTier);
    if (absDir === 1) angleDegrees = 10; // Slight
    if (absDir === 2) angleDegrees = 25; // Normal
    if (absDir === 3) angleDegrees = 50; // Way offline (Severely punishes triangle hypotenuse)
    
    // Convert angle to radians for Math.cos()
    const angleRadians = angleDegrees * (Math.PI / 180);

    let rawShotDistance = 0;

    if (isChipping) {
        // Chipping logic scales based on distance to pin
        let powerMod = 1.0;
        if (contact === 'way-long') powerMod = 1.60;
        if (contact === 'long') powerMod = 1.30;
        if (contact === 'slight-long') powerMod = 1.10;
        if (contact === 'slight-short') powerMod = 0.85;
        if (contact === 'short') powerMod = 0.60;
        if (contact === 'way-short') powerMod = 0.35;

        rawShotDistance = Math.round(distanceToPin * powerMod);
    } else {
        // Normal swing logic scales based on club max distance
        let contactMod = 1.0;
        if (contact === 'good') contactMod = 0.90;
        if (contact === 'subpar') contactMod = 0.70;
        if (contact === 'terrible') contactMod = 0.40;

        rawShotDistance = Math.round(clubDist * contactMod);
    }
    
    // LAW OF COSINES: Calculate actual 2D distance remaining to hole
    // c^2 = a^2 + b^2 - 2ab * cos(C)
    let newDistSquared = Math.pow(distanceToPin, 2) + Math.pow(rawShotDistance, 2) - (2 * distanceToPin * rawShotDistance * Math.cos(angleRadians));
    
    distanceToPin = Math.round(Math.sqrt(newDistSquared));
    
    const modeString = isChipping ? "Chipped" : "Swung";
    const logEntry = `Shot ${strokesThisHole}: ${clubName}. ${modeString} ${rawShotDistance}y (Total offline angle: ${angleDegrees}°). <br>`;
    document.getElementById('shot-log').innerHTML = logEntry + document.getElementById('shot-log').innerHTML;

    updateUI();

    // Check if on green (20 yards threshold)
    if (distanceToPin <= 20) {
        handleGreen();
    }
}

function handleGreen() {
    // 2 putts unless you chip it within 1 yard (<= 1)
    let putts = (distanceToPin <= 1) ? 1 : 2;
    
    strokesThisHole += putts;
    const scoreThisHole = strokesThisHole - course[currentHoleIndex].par;
    totalScoreVsPar += scoreThisHole;

    let popupMsg = `You reached the green!\n\nDistance remaining: ${distanceToPin}y\nPutts taken: ${putts}\n\nTotal Strokes: ${strokesThisHole} (Par ${course[currentHoleIndex].par})`;
    
    setTimeout(() => {
        alert(popupMsg);
        loadHole(currentHoleIndex + 1);
    }, 300);
}
