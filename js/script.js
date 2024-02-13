const notes = [
  "C4",
  "D4",
  "E4",
  "F4",
  "G4",
  "A4",
  "B4",
  "C5",
  "D5",
  "E5",
  "F5",
  "G5",
  "A5",
  "B5",
  "C6",
  "D6",
  "E6",
  "F6",
  "G6",
  "A6",
  "B6",
];

const colors = [
  "#D0E7F5",
  "#D9E7F4",
  "#D6E3F4",
  "#BCDFF5",
  "#B7D9F4",
  "#C3D4F0",
  "#9DC1F3",
  "#9AA9F4",
  "#8D83EF",
  "#AE69F0",
  "#D46FF1",
  "#DB5AE7",
  "#D911DA",
  "#D601CB",
  "#E713BF",
  "#F24CAE",
  "#FB79AB",
  "#FFB6C1",
  "#FED2CF",
  "#FDDFD5",
  "#FEDCD1",
];

const paper = document.getElementById("paper");
const pen = paper.getContext("2d");

const settings = {
  startTime: new Date().getTime(),
  duration: 420,
  maxCycles: Math.max(colors.length, 100),
  soundEnabled: false,
  pulseEnabled: true,
};

const fatBoySF = {
  url: "https://gleitz.github.io/midi-js-soundfonts/FatBoy/kalimba-mp3.js",
  sourceUrl: "https://gleitz.github.io/midi-js-soundfonts/",
  gain: 6,
};

const KalimbaSF = Soundfont.instrument(new AudioContext(), fatBoySF.url, {
  gain: fatBoySF.gain,
});

const playNote = (note) => {
  KalimbaSF.then(function (kalimba) {
    kalimba.play(note);
  });
};

const sound = document.getElementById("sound-toggler");

const handleSoundToggle = (enabled = !settings.soundEnabled) => {
  settings.soundEnabled = enabled;
};

document.onvisibilitychange = () => handleSoundToggle(false);

paper.onclick = () => {
  handleSoundToggle();

  // toggle sound guide
  const soundGuide = document.getElementById("sound-guide");
  const toggled = settings.soundEnabled ? "true" : "false";
  soundGuide.dataset.toggled = toggled;
};

let arcs = [];

const calculateVelocity = (index) => {
  const numberOfCycles = settings.maxCycles - index,
    distancePerCycle = 2 * Math.PI;

  return (numberOfCycles * distancePerCycle) / settings.duration;
};

const calculateNextImpactTime = (currentImpactTime, velocity) => {
  return currentImpactTime + (Math.PI / velocity) * 1000;
};

const calculateDynamicOpacity = (
  currentTime,
  lastImpactTime,
  baseOpacity,
  maxOpacity,
  duration,
) => {
  const timeSinceImpact = currentTime - lastImpactTime,
    percentage = Math.min(timeSinceImpact / duration, 1),
    opacityDelta = maxOpacity - baseOpacity;

  return maxOpacity - opacityDelta * percentage;
};

const determineOpacity = (
  currentTime,
  lastImpactTime,
  baseOpacity,
  maxOpacity,
  duration,
) => {
  if (!settings.pulseEnabled) return baseOpacity;

  return calculateDynamicOpacity(
    currentTime,
    lastImpactTime,
    baseOpacity,
    maxOpacity,
    duration,
  );
};

const calculatePositionOnArc = (center, radius, angle) => ({
  x: center.x + radius * Math.cos(angle),
  y: center.y + radius * Math.sin(angle),
});

const init = () => {
  pen.lineCap = "round";

  arcs = colors.map((color, index) => {
    const velocity = calculateVelocity(index),
      lastImpactTime = 0,
      nextImpactTime = calculateNextImpactTime(settings.startTime, velocity);

    return {
      color,
      velocity,
      lastImpactTime,
      nextImpactTime,
    };
  });
};

const drawArc = (x, y, radius, start, end, action = "stroke") => {
  pen.beginPath();

  pen.arc(x, y, radius, start, end);

  if (action === "stroke") pen.stroke();
  else pen.fill();
};

const drawPointOnArc = (center, arcRadius, pointRadius, angle) => {
  const position = calculatePositionOnArc(center, arcRadius, angle);

  drawArc(position.x, position.y, pointRadius, 0, 2 * Math.PI, "fill");
};

const draw = () => {
  paper.width = paper.clientWidth;
  paper.height = paper.clientHeight;

  const currentTime = new Date().getTime(),
    elapsedTime = (currentTime - settings.startTime) / 1000;

  const length = Math.min(paper.width, paper.height) * 0.9,
    offset = (paper.width - length) / 2;

  const start = {
    x: offset,
    y: paper.height / 2,
  };

  const end = {
    x: paper.width - offset,
    y: paper.height / 2,
  };

  const center = {
    x: paper.width / 2,
    y: paper.height / 2,
  };

  const base = {
    length: end.x - start.x,
    minAngle: 0,
    startAngle: 0,
    maxAngle: 2 * Math.PI,
  };

  base.initialRadius = base.length * 0.05;
  base.circleRadius = base.length * 0.006;
  base.clearance = base.length * 0.03;
  base.spacing =
    (base.length - base.initialRadius - base.clearance) / 2 / colors.length;

  arcs.forEach((arc, index) => {
    const radius = base.initialRadius + base.spacing * index;

    // Draw arcs
    pen.globalAlpha = determineOpacity(
      currentTime,
      arc.lastImpactTime,
      0.15,
      0.65,
      1000,
    );
    pen.lineWidth = base.length * 0.002;
    pen.strokeStyle = arc.color;

    const offset = (base.circleRadius * (5 / 3)) / radius;

    drawArc(center.x, center.y, radius, Math.PI + offset, 2 * Math.PI - offset);

    drawArc(center.x, center.y, radius, offset, Math.PI - offset);

    // Draw impact points
    pen.globalAlpha = determineOpacity(
      currentTime,
      arc.lastImpactTime,
      0.15,
      0.85,
      1000,
    );
    pen.fillStyle = arc.color;

    drawPointOnArc(center, radius, base.circleRadius * 0.75, Math.PI);

    drawPointOnArc(center, radius, base.circleRadius * 0.75, 2 * Math.PI);

    // Draw moving circles
    pen.globalAlpha = 1;
    pen.fillStyle = arc.color;

    if (currentTime >= arc.nextImpactTime) {
      if (settings.soundEnabled) {
        playNote(notes[index]);
        arc.lastImpactTime = arc.nextImpactTime;
      }

      arc.nextImpactTime = calculateNextImpactTime(
        arc.nextImpactTime,
        arc.velocity,
      );
    }

    const distance = elapsedTime >= 0 ? elapsedTime * arc.velocity : 0,
      angle = (Math.PI + distance) % base.maxAngle;

    drawPointOnArc(center, radius, base.circleRadius, angle);
  });

  requestAnimationFrame(draw);
};

init();

draw();
