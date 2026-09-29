/* =============================================================
   EVENT DATA
   Edit titles, summaries, eligibility, member limits and rules here.
   The Events page, details popups and registration forms use this file.
   ============================================================= */
window.BNMPC_EVENTS = [
  {
    slug: "project-display",
    title: "Project Display",
    type: "Innovation",
    summary: "Present an original scientific project in Mechanical, Non-Mechanical or IT category.",
    eligibility: "Groups B, C and D",
    groups: ["B", "C", "D"],
    minMembers: 2,
    maxMembers: 3,
    sameInstitution: true,
    entryNameLabel: "Project Name",
    extraFields: [{ key: "projectCategory", label: "Project Category", type: "select", options: ["Mechanical", "Non-Mechanical", "IT"], required: true }],
    rules: [
      "Projects will be judged in three categories: Mechanical, Non-Mechanical and IT.",
      "All team members must be from the same institution.",
      "Each team must have a minimum of 2 and a maximum of 3 members.",
      "Participants must bring all necessary equipment, including a multiplug and laptop."
    ]
  },
  {
    slug: "wall-magazine",
    title: "Wall Magazine",
    type: "Creative",
    summary: "Communicate a science-based subject through research, writing and visual storytelling.",
    eligibility: "Groups B, C and D",
    groups: ["B", "C", "D"],
    minMembers: 2,
    maxMembers: 3,
    sameInstitution: true,
    entryNameLabel: "Wall Magazine Name",
    rules: [
      "The subject of the wall magazine must be science-based.",
      "All team members must be from the same institution.",
      "Each team must have a minimum of 2 and a maximum of 3 members.",
      "There is no specific size standard for the wall magazine."
    ]
  },
  {
    slug: "scrapbook",
    title: "Scrapbook",
    type: "Creative",
    summary: "Create a carefully researched visual story around a science-based subject.",
    eligibility: "Groups B, C and D",
    groups: ["B", "C", "D"],
    minMembers: 1,
    maxMembers: 1,
    entryNameLabel: "Scrapbook Name",
    rules: ["The subject of the scrapbook must be science-based.", "This is a solo event."]
  },
  {
    slug: "physics-olympiad",
    title: "Physics Olympiad",
    type: "Olympiad",
    summary: "Test conceptual understanding, reasoning and physics problem-solving.",
    eligibility: "Open for all groups",
    groups: ["A", "B", "C", "D"],
    minMembers: 1,
    maxMembers: 1,
    rules: ["20 questions carrying 1 mark each.", "Duration: 20 minutes.", "No spot registration.", "Bring your own equipment.", "Calculators and mobile devices are prohibited."]
  },
  {
    slug: "chemistry-olympiad",
    title: "Chemistry Olympiad",
    type: "Olympiad",
    summary: "Explore chemical concepts, reactions and analytical reasoning.",
    eligibility: "Open for all groups",
    groups: ["A", "B", "C", "D"],
    minMembers: 1,
    maxMembers: 1,
    rules: ["20 questions carrying 1 mark each.", "Duration: 20 minutes.", "No spot registration.", "Bring your own equipment.", "Calculators and mobile devices are prohibited."]
  },
  {
    slug: "mathematics-olympiad",
    title: "Mathematics Olympiad",
    type: "Olympiad",
    summary: "Solve mathematical problems through logic, accuracy and creative thinking.",
    eligibility: "Open for all groups",
    groups: ["A", "B", "C", "D"],
    minMembers: 1,
    maxMembers: 1,
    rules: ["20 questions carrying 1 mark each.", "Duration: 20 minutes.", "No spot registration.", "Bring your own equipment.", "Calculators and mobile devices are prohibited."]
  },
  {
    slug: "biology-olympiad",
    title: "Biology Olympiad",
    type: "Olympiad",
    summary: "Apply your knowledge of living systems, genetics, ecology and observation.",
    eligibility: "Open for all groups",
    groups: ["A", "B", "C", "D"],
    minMembers: 1,
    maxMembers: 1,
    rules: ["20 questions carrying 1 mark each.", "Duration: 20 minutes.", "No spot registration.", "Bring your own equipment.", "Calculators and mobile devices are prohibited."]
  },
  {
    slug: "it-olympiad",
    title: "IT Olympiad",
    type: "Olympiad",
    summary: "Challenge your knowledge of information technology and digital systems.",
    eligibility: "Open for all groups",
    groups: ["A", "B", "C", "D"],
    minMembers: 1,
    maxMembers: 1,
    rules: ["20 questions carrying 1 mark each.", "Duration: 20 minutes.", "No spot registration.", "Bring your own equipment.", "Calculators and mobile devices are prohibited."]
  },
  {
    slug: "gk-olympiad",
    title: "General Knowledge Olympiad",
    type: "Olympiad",
    summary: "Compete across science, technology, history and the world around us.",
    eligibility: "Open for all groups",
    groups: ["A", "B", "C", "D"],
    minMembers: 1,
    maxMembers: 1,
    rules: ["20 questions carrying 1 mark each.", "Duration: 20 minutes.", "No spot registration.", "Bring your own equipment.", "Calculators and mobile devices are prohibited."]
  },
  {
    slug: "marvel-dc-quiz",
    title: "Marvel & DC Quiz",
    type: "Quiz",
    summary: "Put your Marvel and DC universe knowledge to the test.",
    eligibility: "Open for all groups",
    groups: ["A", "B", "C", "D"],
    minMembers: 1,
    maxMembers: 1,
    rules: ["20 questions carrying 1 mark each.", "Duration: 20 minutes.", "No spot registration.", "Participants must bring their own equipment."]
  },
  {
    slug: "movie-series-quiz",
    title: "Movie & Series Quiz",
    type: "Quiz",
    summary: "Compete on the announced selection of films and television series.",
    eligibility: "Open for all groups",
    groups: ["A", "B", "C", "D"],
    minMembers: 1,
    maxMembers: 1,
    rules: ["Series syllabus: Alice in Borderland, Dexter and Young Sheldon.", "Movie syllabus: Oppenheimer, Johnny English 2 and Parasite.", "20 questions carrying 1 mark each.", "Duration: 20 minutes.", "No spot registration.", "Participants must bring their own equipment."]
  },
  {
    slug: "team-quiz",
    title: "Team Quiz",
    type: "Quiz",
    summary: "A two-member quiz with a preliminary written round and final round.",
    eligibility: "Groups C and D",
    groups: ["C", "D"],
    minMembers: 2,
    maxMembers: 2,
    sameInstitution: true,
    teamName: true,
    rules: ["Both members must be from the same institution.", "Each team must have exactly 2 members.", "There will be two consecutive rounds: Preliminary Written Round and Final Round."]
  },
  {
    slug: "multimedia-presentation",
    title: "Multimedia Presentation",
    type: "Presentation",
    summary: "Present a recent scientific topic in a focused five-minute presentation.",
    eligibility: "Groups C and D",
    groups: ["C", "D"],
    minMembers: 2,
    maxMembers: 2,
    sameInstitution: true,
    entryNameLabel: "Presentation Topic",
    rules: ["The presentation must cover a recent scientific topic.", "There is no slide limit.", "Maximum presentation time is 5 minutes.", "Both members must be from the same institution.", "Each team must have exactly 2 members.", "Participants must bring all necessary equipment, including a multiplug and laptop."]
  },
  {
    slug: "extempore-speech",
    title: "Extempore Speech",
    type: "Speech",
    summary: "Deliver a concise science-based speech on a topic revealed at the event.",
    eligibility: "Groups C and D",
    groups: ["C", "D"],
    minMembers: 1,
    maxMembers: 1,
    rules: ["The topic will be selected immediately before the event.", "Each participant will receive 3 minutes to deliver the speech.", "The speech topic will be science-based."]
  },
  {
    slug: "scientific-story-writing",
    title: "Scientific Story Writing",
    type: "Writing",
    summary: "Develop an original science-fiction story from a supplied opening prompt.",
    eligibility: "Open for all groups",
    groups: ["A", "B", "C", "D"],
    minMembers: 1,
    maxMembers: 1,
    rules: ["Write a science-fiction story with a strong scientific base.", "A starting passage will be provided and must be developed creatively.", "All devices must remain switched off.", "Duration: 20 minutes.", "Plagiarism will result in immediate disqualification."]
  },
  {
    slug: "sudoku",
    title: "Sudoku",
    type: "Puzzle",
    summary: "Solve accurately under time pressure to qualify for the final ranking.",
    eligibility: "Open for all groups",
    groups: ["A", "B", "C", "D"],
    minMembers: 1,
    maxMembers: 1,
    rules: ["The top 10 participants will be selected after the first 20 minutes.", "Three winners will be selected from the top 10.", "No spot registration.", "Participants must bring their own equipment.", "Mobile devices are prohibited during the event."]
  },
  {
    slug: "case-solving",
    title: "Case Solving",
    type: "Problem Solving",
    summary: "Use clues, riddles and logical reasoning to identify the culprit.",
    eligibility: "Groups C and D",
    groups: ["C", "D"],
    minMembers: 1,
    maxMembers: 1,
    rules: ["Participants will solve riddles and problems to identify the culprit.", "Duration: 20 minutes.", "This is a solo event."]
  },
  {
    slug: "coding-contest",
    title: "Coding Contest",
    type: "Technology",
    summary: "Solve programming problems through efficient code and logical thinking.",
    eligibility: "Groups C and D",
    groups: ["C", "D"],
    minMembers: 1,
    maxMembers: 1,
    rules: ["This is a solo event.", "Detailed rules and regulations will be announced through the official BNMPC Science Club Facebook page."]
  },
  {
    slug: "robo-soccer",
    title: "RoboSoccer",
    type: "Robotics",
    summary: "Design and operate a soccer robot in a competitive tournament environment.",
    eligibility: "Open for school and college students",
    groups: ["A", "B", "C", "D"],
    minMembers: 1,
    maxMembers: 3,
    teamName: true,
    rules: [
      "Teams must present valid institutional identification; cross-institutional teams are allowed.",
      "A participant cannot be part of multiple teams.",
      "Each team may have 1 to 3 members and must own and operate its own bot and controller.",
      "Sharing bots or using pre-built robots is prohibited; only registered members may operate the bot.",
      "Controllers may be switched only during halftime.",
      "Maximum dimensions: 30 cm × 30 cm × 20 cm.",
      "Maximum weight: 2.5 kg with ±5% tolerance.",
      "Use an on-board power supply only; node-to-node voltage must not exceed 12.6V.",
      "Only wireless control is allowed, including RF, NRF, Bluetooth, joystick or ESP-NOW.",
      "Bots may push or kick the ball but cannot grab or enclose it.",
      "Servo-based kicking and rubber pads for ball bouncing are prohibited.",
      "Bracket length must be 8 cm or less and width 20 cm or less; it must remain open-type.",
      "Sharp, damaging or hazardous parts are prohibited."
    ]
  },
  {
    slug: "rubiks-cube",
    title: "Rubik’s Cube",
    type: "Speed Solving",
    summary: "Compete in a fast and accurate 3×3 cube-solving challenge.",
    eligibility: "Open for all groups",
    groups: ["A", "B", "C", "D"],
    minMembers: 1,
    maxMembers: 1,
    rules: ["This is a 3×3 cube-solving competition.", "Participants must bring their own Rubik’s Cube.", "A participant will be eliminated if their cube breaks during the competition."]
  },
  {
    slug: "valorant",
    title: "Valorant",
    type: "Esports",
    summary: "Compete through teamwork, tactical planning and precise execution.",
    eligibility: "Groups C and D",
    groups: ["C", "D"],
    minMembers: 5,
    maxMembers: 7,
    teamName: true,
    valorantRoster: true,
    rules: ["Each team must register 5 main players.", "Up to 2 substitute players may be added.", "Detailed match rules will be published later."]
  },
  {
    slug: "fifa",
    title: "FIFA",
    type: "Esports",
    summary: "Test football gaming skill, tactical decisions and match control.",
    eligibility: "Groups C and D",
    groups: ["C", "D"],
    minMembers: 1,
    maxMembers: 1,
    rules: ["This is a solo event.", "Detailed match rules will be published later."]
  }
];
