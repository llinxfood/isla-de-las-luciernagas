// Historical save format from the first published version. Keep this fixture unchanged.
export const legacySave = `{
  "version": 1,
  "facts": {
    "1x6": { "attempts": 5, "correct": 4, "errors": 1, "hints": 2, "averageMs": 4250,
      "lastSeen": 1790942400000, "dueAt": 1791028800000, "level": 2 }
  },
  "completed": [1, 2],
  "decorations": { "1": "flowers", "2": "crystals" },
  "missions": 3,
  "lights": 72,
  "settings": { "sound": true, "motion": false },
  "expedition": {
    "table": 10, "index": 0, "lights": 0, "phase": "playing",
    "questions": [{ "fact": { "id": "10x6", "a": 10, "b": 6 },
      "options": [50, 60, 70, 59], "mistakes": 1, "hinted": true, "resolved": false }]
  }
}`;
