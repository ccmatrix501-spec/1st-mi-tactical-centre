import React, { useEffect, useMemo, useRef, useState } from "react";
import iconUrl from "./assets/icon.png";
import certificateIconUrl from "./assets/certificate-icon.png";

type Tab = "map" | "squad" | "pl" | "builder" | "spec" | "merits";
type Squad = "Demon" | "Nightmare" | "Cerberus" | "Hellfire";
type Status = "" | "yes" | "no" | "na";
type MarkerType = "destroyed" | "noSpawn" | "ore" | "gas" | "base" | "archnigeon" | "hive" | "exterms";
type Item = { id: string; text: string; points: number };
type Section = { id: number; title: string; items: Item[] };
type Cert = { title: string; fields: string[]; pass: number; total: number; fails: string[]; sections: Section[]; notes?: string[] };
type CertState = { info: Record<string, string>; scores: Record<string, Status>; fails: Record<string, boolean>; notes: string };
type Marker = { id: string; type: MarkerType; x: number; y: number; map: string };
type SquadState = { orders: string; ore: number; gas: number; checks: Record<string, boolean> };
type SpecDef = { passScore: number; totalPoints: number; sections: Array<{ title: string; items: string[] }>; instantFails: string[] };
type OverlayApiWindow = Window & {
  steOverlay?: {
    open: () => Promise<void>;
    close: () => Promise<void>;
    setClickThrough: (enabled: boolean) => Promise<void>;
  };
};

const appAsset = (path: string) => {
  const cleanPath = path.replace(/^\/+/, "");
  const basePath = window.location.href.split("#")[0];

  return new URL(cleanPath, basePath).toString();
};

const maps = ["Valaka Plateau", "Boreas", "Agni Prime", "X-11"];
const boreasLevels = ["Plateau", "Caves", "Canyon"];
const squads: Squad[] = ["Demon", "Nightmare", "Cerberus", "Hellfire"];
const tabs: Array<{ id: Tab; label: string }> = [
  { id: "map", label: "Tac Map" },
  { id: "squad", label: "Squad Certification" },
  { id: "pl", label: "PL Certification" },
  { id: "builder", label: "Builder Certification" },
  { id: "spec", label: "Specialisation Certifications" },
  { id: "merits", label: "Merits & Awards" }
];

const colours = [
  {
    id: "demon red",
    label: "demon red",
    accent: "#ff0000",
    soft: "#ff0000",
  },
  {
    id: "nightmare blue",
    label: "nightmare blue",
    accent: "#0044ff",
    soft: "#0044ff",
  },
  {
    id: "Cerberus green",
    label: "Cerberus green",
    accent: "#00ff5e",
    soft: "#00ff5e",
  },
  {
    id: "hellfire orange",
    label: "hellfire orange",
    accent: "#ff7300",
    soft: "#ff7300",
  },
  {
    id: "Cobber Carbon",
    label: "Cobber Carbon",
    accent: "#5c5c5c",
    soft: "#5c5c5c",
    metallic: "linear-gradient(135deg, #080808 0%, #4c4a4a 16%, #c3baba 34%, #ffffff 48%, #5c5656 64%, #d7d0d0 82%, #050505 100%)"
  },
  {
    id: "purplewolf purple",
    label: "purplewolf purple",
    accent: "#8400ff",
    soft: "#8400ff",
    metallic: "linear-gradient(135deg, #0b0014 0%, #3d0078 16%, #8400ff 34%, #d8a6ff 48%, #3d0078 64%, #9e33ff 82%, #05000a 100%)"
  },
  {
    id: "matrix multi",
    label: "matrix multi",
    accent: "#1eff00",
    soft: "#1eff00",
    metallic: "linear-gradient(135deg, #001000 0%, #013800 14%, #059100 30%, #6aff63 45%, #011f00 58%, #05d000 76%, #000800 100%)"
  },
  {
    id: "tina tingle",
    label: "tina tingle",
    accent: "rgb(115, 79, 150)",
    soft: "rgb(115, 79, 150)",
    metallic: "linear-gradient(135deg, #09050d 0%, #4f3369 16%, rgb(115, 79, 150) 34%, #d8b7f5 48%, #4f3369 64%, #9c70c5 82%, #050307 100%)"
  },
  {
    id: "Glasgow Gold",
    label: "Glasgow Gold",
    accent: "rgb(255, 215, 55)",
    soft: "rgb(255, 215, 55)",
    metallic: "linear-gradient(135deg, #1a1200 0%, #8a6500 16%, rgb(255, 215, 55) 34%, #fff4b0 48%, #8a6500 64%, #ffd93b 82%, #0d0900 100%)"
  }
];

const mapAssetPaths: Record<string, string> = {
  "Valaka Plateau": "assets/maps/valaka-plateau.png",
  "Boreas": "assets/maps/boreas-plateau.png",
  "Boreas Plateau": "assets/maps/boreas-plateau.png",
  "Boreas Caves": "assets/maps/boreas-caves.png",
  "Boreas Canyon": "assets/maps/boreas-canyon.png",
  "Agni Prime": "assets/maps/agni-prime.png",
  "X-11": "assets/maps/x-11.png"
};
const bugHoleMapPaths: Record<string, string> = {
  "Valaka Plateau": "assets/bugholes/valaka-plateau-bugholes.png",
  "Boreas": "assets/bugholes/boreas-plateau-bugholes.png",
  "Boreas Plateau": "assets/bugholes/boreas-plateau-bugholes.png",
  "Boreas Caves": "assets/bugholes/boreas-caves-bugholes.png",
  "Boreas Canyon": "assets/bugholes/boreas-canyon-bugholes.png",
  "Agni Prime": "assets/bugholes/agni-prime-bugholes.png",
  "X-11": "assets/bugholes/x-11-bugholes.png"
};
const markerTypes: Array<{ id: MarkerType; label: string; icon: string; color: string; path: string }> = [
  { id: "destroyed", label: "Destroyed", icon: "", color: "#ef4444", path: "assets/markers/destroyed.png" },
  { id: "noSpawn", label: "No Spawn", icon: "", color: "#f59e0b", path: "assets/markers/no-spawn.png" },
  { id: "ore", label: "Ore", icon: "", color: "#fb923c", path: "assets/markers/ore.png" },
  { id: "gas", label: "Gas", icon: "", color: "#84cc16", path: "assets/markers/gas.png" },
  { id: "base", label: "Base", icon: "", color: "#38bdf8", path: "assets/markers/base.png" },
  { id: "archnigeon", label: "Archnigeon", icon: "", color: "#c084fc", path: "assets/markers/archnigeon.png" },
  { id: "hive", label: "Hive", icon: "", color: "#f43f5e", path: "assets/markers/hive.png" },
  { id: "exterms", label: "Exterms", icon: "", color: "#22c55e", path: "assets/markers/exterms.png" }
];

const modifiers = [
  "Royal Guard Ambush!", "Integrated Utility Fabricators", "Bugs Inbound", "We Got Bugs!", "Threat Level: Maximum!", "Threat Level: Caution", "Tanker Attack!", "Scorpion Attack!", "Ambush!", "Fleet Relay", "M-11E Babar Drop", "Fed Net Cameras", "M-55 Caches", "Pilium Surplus", "Tac-Fighter Support", "Pitch Black", "Blizzard", "Ashstorm", "Sandstorm", "Thunderstorm", "Tiger Fury", "Inferno Ambush",  "Warrior Fury", "Grenadier Resilience", "Tiger Resilience", "Gunner Resilience", "Warrior Resilience", "Drone Resilience", "Hard Shell", "Grenadier Rush", "Tiger Rush", "Gunner Rush", "Warrior Rush", "Drone Rush", "Elite Grenadiers", "Elite Tigers", "Elite Warriors", "Elite Drones", "Elite Gunners", "Arachnid Fury", "Arachnid Rush", "Increased Patrols", "Grenadier Ambush!"
];

const squadOrderChecks: Record<Squad, string[]> = {
  Demon: [
    "Brief squad",
    "Confirm class setup",
    "Set rally point",
    "Move on PL order",
    "Build defenses around ARC",
    "Build Base defenses",
    "Defend ARC",
    "Clear bug bodies",
    "Call base threats during ARC Slam",
    "Prepare extraction",
    "Board Dropship"
  ],

  Nightmare: [
    "Brief squad",
    "Confirm class setup",
    "Secure ore",
    "Secure gas",
    "Update PL on resource status",
    "Return cans safely",
    "Return to base",
    "Defend base during ARC Slam",
    "Prepare extraction",
    "Board Dropship"
  ],

  Cerberus: [
    "Brief squad",
    "Confirm class setup",
    "Move on PL order",
    "Set rally point",
    "QRF ready",
    "Establish dog house",
    "Follow PL orders for objective work",
    "Set extraction rally point",
    "Defend base during ARC Slam",
    "Board Dropship"
  ],

  Hellfire: [
    "Brief squad",
    "Confirm class setup",
    "Split battle buddies",
    "Move on PL order",
    "Destroy Bug Holes",
    "Destroy Hive",
    "Destroy Exterms",
    "Defend base during ARC Slam",
    "kill/Destroy HVT targets during ARC Slam",
    "Board Dropship"
  ]
};

const classOptions = [
  "Guardian",
  "Medic",
  "Sniper",
  "Engineer",
  "Demolisher",
  "Ranger"
];

const makeItems = (
    prefix: string,
    sec: number,
    texts: string[],
    points?: number[]
    ): Item[] =>
    texts.map((text, i) => ({
      id: `${prefix}-${sec}-${i + 1}`,
      text,
      points: points?.[i] ?? 1
  }));

const generated = (
    prefix: string,
    sec: number,
    count: number,
    label: string
  ) =>
  makeItems(
    prefix,
    sec,
    Array.from({ length: count }, (_, i) => `${label} task ${i + 1}.`)
  );

const makeSection = (id: number, title: string, items: Item[]): Section => ({
    id,
    title,
    items
});

const squadSections: Section[] = [
  makeSection(2, 'Start of Game', makeItems('squad', 2, [
  'On the Fed Net screen, Trainee reminded Troopers to join the correct Squad.',
  "Trainee picked a spot for the Squad to meet up outside of the Dropship (left/right/center), and confirmed Squad Members' readiness.",
  'Trainee communicated with PL that the Squad is ready to move out.',
  'Trainee reiterated the command from PL for the Squad to move out.'
])),
  makeSection(1, "Pre-Game Lobby", makeItems("squad", 1, [
    'Trainee asked each Squad Member for their class preference, giving priority to lowest ranked Troopers.',
    'Trainee formed a Squad in accordance with the map, modifier(s) and Squad Members\' preferences within SL\'s chosen Squad composition.',
    'Trainee informed command when the Squad is ready.',
    'Trainee confirmed with Trainer that they\'re familiar with the Tac-Map and compass.'
  ])), 
  makeSection(3, "Arriving at Base", makeItems("squad", 3, [
    'Trainee reminded the Squad not to place items (Fabs, Mines, Thermo Charges) or to build within the Build Zone.',
    'Trainee used pings and/or cardinal directions to position the Squad in a safe place or the location given by Command.'
  ])),
  makeSection(4, "Moving to Objective", makeItems("squad", 4, ["Trainee reminded the Squad to resupply with Hard Ammo before moving to the objective.", "Trainee used pings and/or descriptions of a rally point for the Squad to meet before leaving the Base. (2 points)", "Trainee kept the Squad together and safe when moving, calling out people getting too far ahead or behind.            (3 points)"], [1, 2, 3])),

  makeSection(5, "Arriving/Working at Objectives", makeItems("squad", 5, [
    "Trainee used pings and/or verbal description to inform the Squad of safe places around the objective, in case of an Ambush. (2 points)",
    "Trainee properly set up at the objective location. (Fabricators, member positioning/functions, Hard Ammo). (2 points)",
    "Trainee pointed out possible Tac-Map threats in the AO (roaming Royal Guards, Exterms near objective, Plasma Bombardments, and Tac Fighter Strikes).",
    "Trainee gave Command important updates on the objective progression. (Starting the objective if it is delayed, losing cans, RTB, completing Exterms etc.) Requesting backup when needed, inform Command when the Squad has been wiped. (3 points)"
  ], [2, 2, 1, 3])),
  makeSection(6, "Returning to Base", makeItems("squad", 6, [
    "When the Squad arrived at the base, Trainee informed Command of the Squad's return, along with what resources were being deposited.",
    "Trainee reminded the Squad to resupply before moving back to the base, and was able to adjust the return route in real time depending on battlefield conditions (Exterms, Horde).",
    "Trainee directed the Squad to take up a defensive position around the Base until given further orders by Command. Informs Command that the Squad is ready for the next tasking.",
    "During the Arc Slam, Trainee reminded the Squad to place Fabricators near their assigned defensive position."
  ])),
  makeSection(7, "Extraction", makeItems("squad", 7, [
    "Trainee relayed Command's orders on where to meet for Extraction and ensured all Squad Members were present.",
    "Trainee ensured all Squad Members have re-armed and re-stimmed when moving towards the designated Extraction meetup location.",
    "Trainee used pings and/or verbal descriptions to guide his Squad in accordance with Command's instructions for Extraction."
  ])),
  makeSection(8, "Overall Performance", makeItems("squad", 8, ["Trainee clearly communicated with other Squads during shared objectives.       (2 points)", "Trainee quickly, clearly and concisely confirmed all orders from Command.     (3 points)", "Trainee remained calm, cool, and collected during the entire operation.           (2 points)", "Trainee accepted feedbacks and criticisms well."], [2, 3, 2, 0]))
];
const plSections: Section[] = [
  makeSection(1, "Pre-Game Lobby", makeItems("pl", 1, [
    'Trainee gained control of the Lobby and cleared comms.',
    'Trainee priortized getting waiting Troopers and lowest ranked Troopers into the Flight Deck.',
    'Trainee organized Squad Leaders within a timely manner.',
    'Trainee clearly communicated Map, Mutators and Certification Restrictions within the Game Lobby.',
    'Trainee confirmed each Squad\'s readiness.'
  ])),
  makeSection(2, "Start of Game", makeItems("pl", 2, [
    'Trainee checked in with the Squads and assured all Troopers were accounted for.',
    'Trainee reminded Squad Leaders about the Certification Restrictions.',
    'Trainee secured the front of the Dropship, then instructed the Squads to move in a timely manner.',
    'Trainee prepositioned the Squad(s) across the Map as needed.'
])),
  makeSection(3, "Arriving at Build Zone", makeItems("pl", 3, [
    'Trainee reminded all Troopers to not build within the Build Zone.',
    'Trainee commanded the Squads to take defensive positions around the Build Zone.',
    'Trainee made sure the Squad(s) have arrived at their prepositioned location(s).'
])),
  makeSection(4, "Operations", makeItems("pl", 4, ["Trainee commanded the Squad(s) to begin Ore collection.", "Trainee guided each Squad to their objective(s) using cardinal directions and/or landmarks and/or descriptions. (4 points)", "Trainee commanded the Squad(s) to begin Gas collection.", "After 3-5 cans of Gas, Trainee checked with the Builder to see if more Ore is needed.", "Trainee successfully directed the Squad(s) to exterms. (3 points)", "Trainee successfully kept the Squad(s) updated on Exterm time/kill count.          (3 points)"], [1, 4, 1, 1, 3, 3])),
  makeSection(5, "Beginning of ARC Slam", makeItems("pl", 5, ["Trainee confirmed the Base's readiness with the Builder and gave the order to put the last Gas into the ARC.", "Trainee assigned each Squad a designated location for the ARC Slam.", "Trainee made sure all Squads are at their assigned locations (Tac-Map and visually)."])),
  makeSection(6, "ARC Slam", makeItems("pl", 6, ["Trainee called out High Value Targets (Plasma Grenadiers, Inferno Bugs, Gunner Hordes, etc.) during ARC Slam.", "Trainee called out any Base breaches and Bug Piles that needs to be cleared. (2 points)", "Trainee informed all Squads at 60% when and where to meet up for Extraction and to hold grenades and lures at 80%.", "Trainee reminded all Squads at 80% when and where to meet up and to hold grenades and lures. (3 points)", "Trainee maintained a calm demeanour during the ARC Slam."], [1, 2, 1, 3, 1])),
  makeSection(7, "Extraction", makeItems("pl", 7, [
    'Trainee made sure all Troopers are at the meet location (Tac-Map and visually).',
    'Trainee commanded all Demolishers to launch the lures.',
    'Trainee commanded all Squads to start moving towards the Dropship in a timely manner after lure deployment.',
    'Trainee kept all Squads moving in a timely manner towards the Dropship.',
    'Trainee issued a final reminder for all Squads to board the Dropship at 30 seconds at the latest.'
  ])),
  makeSection(8, "Overall Performance", makeItems("pl", 8, ["Trainee prioritized Hive. (3 points)", "Trainee made sure the Field Squads were aware of Tac-Map dangers in their AO (Plasma Bombardments, Exterms, ETC.).                   (3 points)", "Trainee desmonstrated clear and concise communication (both giving commands and receiving Squad communications). (5 points)", "Trainee was receptive to feedback.", "Trainee remained calm, cool, and collected for the entire Operation."], [3, 3, 5, 1, 1]))
];
const builderSections: Section[] = [
  makeSection(1, "Pre-Game Lobby", makeItems("builder", 1, [
    'Builder Candidate asked squad for class preferences.',
    'Builder candidate gave priority to lowest ranked troopers.',
    'Builder candidate formed a squad in accordance with modifiers and the squads preferences. Must include 2nd Engineer.',
    'Builder candidate did NOT overly micro manage squad loadout.',
    'Builder Candidate Informed PL when Squad loadout and all troopers were ready.'
  ])),
  makeSection(2, "Start of Game", makeItems("builder", 2, [
    'On Fed Net screen, the Builder Candidate reminded troopers to join correct squad.',
    'Builder Candidate picks spot for squad to meet up outside of dropship. (left/right/center)',
    'Builder Candidate reminded troopers to stock up on health stims.',
    'Builder Candidate Communicated with PL that the squad is ready to move out.',
    'Builder Candidate reiterated command from PL for squad to move out.'
  ])),
  makeSection(3, "Early-Game | Ore Stage", makeItems("builder", 3, [
    'Builder Candidate constructed HQ and placed hard ammo near the Mobile HQ. (Cannot place between deposit chambers for spawning reasons).',
    'Builder Candidate ensured the arc is secure on four sides with robust buildable structures or map provided hard structures, while providing at least two methods of access and egress: ramps, reversed walls, gates or ladders.  (see attachment BS3.0-1.8-AC-rev.1)',
    'Builder Candidate placed their own HMG with Ammo outside of build area, with good field of fire - or directed secondary engineer to place theirs (N/A If site does not allow).',
    'Builder Candidate Added a bunker and additional ammo at the bunker entrance.',
    'Builder Candidate expanded the base by starting a second layer perimeter wall 1 build square from the ARC.'
  ])),
  makeSection(4, "Mid-Game | Gas Stage", makeItems("builder", 4, [
    'Builder Candidate successfully placed an electric fence inside the base walls and within 1 build square of ARC.         (see attachment BS3.0-1.8-EFL-rev.1)',
    'Builder Candidate completed the second layer perimeter wall and added a third wall layer or a second Bunker (or both).',
    'Builder Candidate placed at least one tower, spotlight, wall, or other structures as "lightning rods" outside the core base perimeter and along base structures vulnerable to enemy artillery.                                                        (see attachment BS3.0-1.8-LR-rev.1)',
    'Builder Candidate directed secondary engineer to place at least one of their ability resources (short walls, light poles, and/or ammo).',
    'Builder Candidate ensured hard ammo, soft ammo, and medical stims are available throughout the base for the duration of the OP.',
    'Builder Candidate successfully mantained ore reserves (minimum 800 ore left at the start of arc slam) to allow for ammo needs throughout arc slam.'
  ])),
  makeSection(5, "ARC Slam & Extraction", makeItems("builder", 5, [
    'Arc survived until extraction timer appears.',
    'Builder Candidate ensured squad was resupplied with hard ammo, healed and assembled at PLs rally point.',
    'Builder Candidate orders squad to move to dropship.'
  ])),
  makeSection(6, "Overall Tasks", makeItems("builder", 6, [
    'Candidate remained calm, cool, and collected for the entire operation. Did not berate squad or other platoon members.',
    'Candidate clearly and quickly communicated with PL when orders were given or questions asked.',
    'Candidate was receptive to feedback.'
  ])),
  makeSection(7, "General Base Layout Review", makeItems("builder", 7, [
    'Builder Candidate has built the base to be easy to move around and able to be easily repaired.',
    'Buidler Candidate has built the base to have good lines-of-sight to clear bugs in case of breach.',
    'Builder Candidate has built the base while keeping in mind the natural chokepoints of the FOB that will be focused on by the Bugs.',
    'Tick one box for each build square that is fully enclosed (honeycombed), excluding the Arc square.',
    'Tick one box for each hard structure intentionally utilized by the Builder Candidate as a defense platform to be occupied by a squad instead of base structures.'
  ]))
];

const squadCert: Cert = {
  title: "Squad Certification Checklist",
  fields: ["Trainer Name", "Trainee Name", "Map", "Platoon Leader", "Mutators", "Squad Comp", "Squad"],
  pass: 34,
  total: 38,
  fails: [
    "Failure to keep Squad on Main Objective.",
    "Conduct unbecoming of a 1st M.I. trooper."
  ],
  sections: squadSections,
 notes: [
  "PG fire that makes you unrevivable.",
  "If any member disconnects.",
  "If contractors join mid-game.",
  "If members refuse to listen.",
  "Sent to Fleet for a week."
]
};
const plCert: Cert = {
  title: "PL Certification Checklist",
  fields: ["Trainer Name", "Trainee Name", "Map", "Mutators"],
  pass: 49,
  total: 54,
  fails: [
    "Defeat screen.",
    "Failure to communicate with the Builder.",
    "Less than 16/16 Extraction.",
    "Conduct unbecoming of a 1st M.I. trooper."
  ],
  sections: plSections,
  notes: [
  "PG fire that makes you unrevivable.",
  "If any member disconnects.",
  "If contractors join mid-game.",
  "If members refuse to listen.",
  "Sent to Fleet for a week."
]
};
const builderFields = [
  "Trainer Name",
  "Candidate",
  "Map",
  "Platoon Leader",
  "Mutators",
  "Squad Comp",
  "Squad"
];
const builderFails = ["Destruction of ARC.", "Behavior unbecoming of a 1st M.I. Trooper.", "Three checks in section VII point 4.", "Three checks in section VII point 5."];
const builderPass = ["No more than 3 NO marks.", "Must have 11/11 YES marks across sections III and IV."];

const specBase = [
  { title: "I. Preparation and Match Start", items: ["Trainee organized the Squad using company doctrine and battlefield mutators.", "Trainee used pings and/or cardinal directions to position the Squad in a defensive position or the location given by the PL."] },
  { title: "II. Moving to Objective", items: ["Trainee used pings and/or descriptions of a rally point for the Squad to meet before leaving the Base.", "Trainee used pings and/or descriptions of safe locations for use in the event of an Ambush or being overrun.", "Trainee kept the Squad together and safe when moving, calling out people getting too far ahead or behind."] },
  { title: "III. Working at Objective", items: ["Trainee used pings and/or verbal description to inform the Squad of safe places around the objective, in case of an Ambush.", "Trainee properly set up at the objective location. (Small Walls, Fabricators, Trooper positioning, pre-orders and functions, Hard Ammo Crate).", "Trainee pointed out possible threats in the AO using the Tactical Map (Royal Guards, Exterminations, Plasma Bombardments or Tac Fighter Strikes)."] },
  { title: "IV. Returning to Base", items: ["When the Squad arrived at the base, Trainee informed PL of the Squad's return along with what resources were retrieved.", "Trainee reminded the Squad to resupply before moving back to the base and was able to adjust the return route in real time depending of battlefield conditions.", "Trainee directed the Squad to take up a defensive position around the Base until given further orders by the PL, then informs them when the Squad is ready for the next tasking."] }
];
const specialisations: Record<Squad, SpecDef> = {
  Demon: { passScore: 19, totalPoints: 21, sections: [...specBase, { title: "V. Company Specific", items: ["Trainee called out Bug spawns around the base using cardinal directions.", "Trainee ensured any wall breaches in the base were called out using cardinal directions.", "In the event of the ARC being attacked, the trainee directed the squad to move ASAP to clear it while communicating with the Builder.", "Trainee, using cardinal directions when calling orders, demonstrated target priority by calling out Gunners, Plasma Grenadiers, Infernos, etc.", "Trainee has demonstrated how the \"Broken Arrow\" call works and what happens next to remove the threats off of the ARC.", "Trainee did not move further than 200m, or outside of line of sight from the ARC for no apparent reason, unless directed by PL.", "Trainee directed the Squad to escort and cover incoming squads to the base, making sure their canisters are deposited safely.", "Trainee cleared Bugs bodies around the base using available Squad members while no threats are attacking.", "Trainee made sure everyone made it to the dropship while doing extraction (Mulligans can apply here).", "Trainee remained calm, cool, and collected during the entire operation."] }], instantFails: ["ARC takes at least 50 percent damage.", "Squad member dies outside mulligan conditions.", "Conduct unbecoming.", "Any points missed in section five."] },
  Nightmare: { passScore: 19, totalPoints: 21, sections: [...specBase, { title: "V. Company Specific", items: ["Did trainee instruct Engineer 1 and 2 to remove cans from different spots on refinery to (not get a glitched can)", "Did trainee Make sure to eliminate all threats before having Engineers grab any resources.", "Did trainee use Diamond Formation when moving back to base Killer in front(Guardian or Demolisher) two Engineers In middle Medic in the back", "Did the trainee set up defenses around the refinery (Two layers of wall around refinery if terrain allows it One or two hard ammos around it)", "Did trainee (Set up single Box for Engineer safety and use Guardian draw aggro from the bugs and one Hard ammo", "Did trainee instruct squad members to throw Cem Grenades on can 2 or can 3 to keep Engineer safe from bugs   ", "Trainee remained calm, cool, and collected during the entire operation.  ", "Trainee accepted feedbacks and criticisms well.", "Ask trainee do they know what (Two Can Protocol)Meaning is ", "Did trainee informed PL that it is to hot at the refinery or infinite horde to go to (Two Can Protocol) "] }], instantFails: ["Loss of any cans.", "Squad member dies outside mulligan conditions.", "Conduct unbecoming.", "Any points missed in section five."] },
  Cerberus: { passScore: 18, totalPoints: 20, sections: [...specBase, { title: "V. Company Specific", items: ["The Candidate has read the Cerberus Field Guide and tells Trainer what the \"R\" stands for in QRF.", "Candidate tells Trainer what \"On The Bounce\" means and when to use it.", "S.L. and one other Trooper has equiped a Stagger weapon (Hawkeye, carbine, saw, E-pulse) or Stun weapon (Pump shotgun ,Emancipator).", "Candidate coordinates squad to effectively establish a beachhead at the front of drop ship with each trooper using their utility.", "En route to base provide rear guard for platoon enroute to base whilst scanning for possible Dog House locations.", "Dog houses established throughout the map in key locations per the Cerberus Field Guide standards.", "Throughout the operation Cerberus is mobilized and en route within 20 seconds of receiving new orders.", "When ARC hits 80%, with PL direction, Cerberus moves out from base to establish a safe rally point for platoon while using class abilites and utilities.", "Cerberus squad will provide rear guard on extract while staying within 50m of the retreating platoon after it has moved past the rally point."] }], instantFails: ["Missing any PL order.", "Squad member dies outside mulligan conditions.", "Conduct unbecoming.", "Any missed points in section five."] },
  Hellfire: { passScore: 16, totalPoints: 18, sections: [...specBase, { title: "V. Company Specific", items: ["Demonstrated proper splitting of Squad.", "Assigned \"Battle Buddies\" for Squad splitting", "Successful clearing of Hive. ", "Demonstrates knowledge of Bug Hole locations within 100m of Base location", "Utilized Map Knowledge to reach and clear objectives safely", "Cleared Bug Holes throughout map between Exterms/ Hive. Prioritizing those that were near refineries first", "Shows Knowledge of how Mutators affect Squad Composition"] }], instantFails: ["Failure to complete Hive Objective or Infinite Horde triggers.", "Squad member dies outside mulligan conditions.", "Conduct unbecoming.", "Any points missed in section five."] }
};

const defaultCert = (): CertState => ({ info: {}, scores: {}, fails: {}, notes: "" });
const defaultSquads = (): Record<Squad, SquadState> => ({
  Demon: { orders: "", ore: 0, gas: 0, checks: {} },
  Cerberus: { orders: "", ore: 0, gas: 0, checks: {} },
  Nightmare: { orders: "", ore: 0, gas: 0, checks: {} },
  Hellfire: { orders: "", ore: 0, gas: 0, checks: {} }
});
const allItems = (sections: Section[]) => sections.flatMap((s) => s.items);
const earned = (sections: Section[], scores: Record<string, Status>) => allItems(sections).filter((i) => scores[i.id] === "yes").reduce((a, i) => a + i.points, 0);
const possible = (sections: Section[], scores: Record<string, Status>) => allItems(sections).filter((i) => scores[i.id] !== "na").reduce((a, i) => a + i.points, 0);
const parseMutators = (value: string) => value ? value.split(",").map((x) => x.trim()).filter(Boolean) : [];
const toggleMutator = (value: string, option: string) => {
  const list = parseMutators(value);
  return list.includes(option) ? list.filter((x) => x !== option).join(", ") : [...list, option].join(", ");
};

const safeName = (text: string) =>
  text.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "save";

const TAC_MAP_SAVE_KEY = "ste-current-tac-map-save";
const TRAINER_NAME_SAVE_KEY = "ste-trainer-name";

const saveTacMapSnapshot = (data: unknown, notify = true) => {
  try {
    const json = JSON.stringify(data);

    localStorage.setItem(TAC_MAP_SAVE_KEY, json);

    if (!notify) return;

    window.dispatchEvent(
      new CustomEvent("ste-tac-map-updated", {
        detail: data
      })
    );

    try {
      const channel = new BroadcastChannel("ste-tac-map-channel");
      channel.postMessage(data);
      channel.close();
    } catch {
      // BroadcastChannel may not be available in some Electron contexts.
    }
  } catch (error) {
    console.warn("Could not save Tac Map snapshot.", error);
  }
};

const getTacMapSnapshot = () => {
  try {
    const saved = localStorage.getItem(TAC_MAP_SAVE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.warn("Could not load Tac Map snapshot.", error);
    return null;
  }
};

const applyTacMapSnapshot = (snapshot: unknown) => {
  try {
    if (!snapshot) return;

    localStorage.setItem(TAC_MAP_SAVE_KEY, JSON.stringify(snapshot));

    window.dispatchEvent(
      new CustomEvent("ste-tac-map-updated", {
        detail: snapshot
      })
    );

    try {
      const channel = new BroadcastChannel("ste-tac-map-channel");
      channel.postMessage(snapshot);
      channel.close();
    } catch {
      // BroadcastChannel may not be available in some Electron contexts.
    }
  } catch (error) {
    console.warn("Could not apply Tac Map snapshot.", error);
  }
};

const clearTacMapSnapshot = () => {
  const resetSquadStates = defaultSquads();

  const resetTacMap = {
    mapName: "",
    activeMapKey: "",
    boreasLevel: "Plateau",
    showBugHoles: false,
    operationRunning: false,
    operationStartedAt: "",
    playerCount: 12,
    notes: "",
    modifiers: [],
    markers: [],
    squadStates: resetSquadStates,
    mapPath: "",
    bugHoleMapPath: ""
  };

  saveTacMapSnapshot(resetTacMap);

  window.dispatchEvent(
    new CustomEvent("ste-tac-map-updated", {
      detail: resetTacMap
    })
  );
};

const setGlobalSaveReadOnly = (locked: boolean) => {
  window.dispatchEvent(
    new CustomEvent("ste-global-save-readonly", {
      detail: locked
    })
  );
};

type SaveFileHandle = { createWritable: () => Promise<{ write: (data: string) => Promise<void> | void; close: () => Promise<void> | void }> };
type FilePickerWindow = Window & {
  showDirectoryPicker?: (options?: { id?: string; mode?: "read" | "readwrite"; startIn?: string }) => Promise<SaveFolderHandle>;
};
type SaveFolderHandle = {
  getFileHandle: (name: string, options?: { create?: boolean }) => Promise<SaveFileHandle>;
};

type SteApiWindow = Window & {
  steApi?: {
    saveJsonToFixedFolder: (fileName: string, data: unknown) => Promise<string>;
  };
};

let saveFolderHandle: SaveFolderHandle | null = null;

const getSaveFolder = async () => {
  const pickerWindow = window as FilePickerWindow;

  if (!pickerWindow.showDirectoryPicker) {
    alert("Folder picker is not available. The app will use download export instead.");
    return null;
  }

  saveFolderHandle = await pickerWindow.showDirectoryPicker({
    id: "ste-tac-map-saves",
    mode: "readwrite",
    startIn: "documents"
  });

  alert("Save folder selected.");
  return saveFolderHandle;
};

const saveJsonToFolder = async (name: string, data: unknown) => {
  const folder = await getSaveFolder();
  if (!folder) return false;
  const file = await folder.getFileHandle(name, { create: true });
  const writable = await file.createWritable();
  await writable.write(JSON.stringify(data, null, 2));
  await writable.close();
  return true;
};

const downloadJson = (name: string, data: unknown) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const exportJson = async (name: string, data: unknown) => {
  const safeFileName = name.endsWith(".json") ? name : name + ".json";

  try {
    if (saveFolderHandle) {
      const file = await saveFolderHandle.getFileHandle(safeFileName, {
        create: true
      });

      const writable = await file.createWritable();
      await writable.write(JSON.stringify(data, null, 2));
      await writable.close();

      alert("Save exported:\n" + safeFileName);
      return;
    }

    const steWindow = window as SteApiWindow;

    if (steWindow.steApi?.saveJsonToFixedFolder) {
      const savedPath = await steWindow.steApi.saveJsonToFixedFolder(
        safeFileName,
        data
      );

      alert("Save exported to default folder:\n" + savedPath);
      return;
    }

    downloadJson(safeFileName, data);
    alert("Save downloaded:\n" + safeFileName);
  } catch (error) {
    console.error("Export failed:", error);

    try {
      downloadJson(safeFileName, data);
      alert("Folder save failed. Download fallback started:\n" + safeFileName);
    } catch {
      alert("Export failed. Check DevTools console.");
    }
  }
};

function runSelfTests() {
  console.assert(modifiers.length >= 20, "modifier list loaded");
  console.assert(parseMutators("A, B").length === 2, "mutator parser works");
  console.assert(toggleMutator("", "A") === "A", "mutator add works");
  console.assert(toggleMutator("A", "A") === "", "mutator remove works");
  console.assert(allItems(builderSections).length === 32, "builder checklist items loaded");
  console.assert(plSections[5].title === "ARC Slam", "PL section six is ARC Slam");
  console.assert(squadSections.length === 8 && plSections.length === 8 && builderSections.length === 7, "cert sections loaded");
  console.assert(tabs.length === 6, "all tabs loaded");
  console.assert(mapAssetPaths.Boreas === "assets/maps/boreas-plateau.png", "Boreas default map path loaded");
  console.assert(mapAssetPaths["Boreas Caves"] === "assets/maps/boreas-caves.png", "Boreas caves map path loaded");
  console.assert(markerTypes.find((m) => m.id === "hive")?.path === "assets/markers/hive.png", "Hive marker path loaded");
  console.assert(bugHoleMapPaths["Boreas Canyon"] === "assets/bugholes/boreas-canyon-bugholes.png", "Boreas canyon bug holes map path loaded");
}
if (typeof window !== "undefined") runSelfTests();

function Button(props: { children: React.ReactNode; onClick?: () => void | Promise<void>; active?: boolean; className?: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={props.disabled}
      onClick={props.disabled ? undefined : props.onClick}
      className={"btn " + (props.active ? "active " : "") + (props.className || "")}
    >
      {props.children}
    </button>
  );
}
function Card(props: { children: React.ReactNode; className?: string }) { return <section className={"card " + (props.className || "")}>{props.children}</section>; }
function TextBox(props: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <textarea
      value={props.value}
      disabled={props.disabled}
      onChange={(event) => props.onChange(event.target.value)}
      placeholder={props.placeholder}
      className={"textbox " + (props.className || "")}
    />
  );
}

function NumberInput(props: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <input
      type="number"
      value={props.value}
      disabled={props.disabled}
      onChange={(event) => {
        if (!props.disabled) {
          props.onChange(Number(event.target.value));
        }
      }}
    />
  );
}

function MutatorDropdown(props: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const selected = parseMutators(props.value);
  const [mutatorSearch, setMutatorSearch] = useState("");

  const filteredModifiers = modifiers.filter((mod) =>
    mod.toLowerCase().includes(mutatorSearch.trim().toLowerCase())
  );

  return (
    <details className="dropdown">
      <summary>{selected.length ? selected.join(", ") : "Select mutators"}</summary>

      <div className="dropdown-menu">
        <input
          type="text"
          value={mutatorSearch}
          placeholder="Search mutators..."
          disabled={props.disabled}
          onChange={(event) => setMutatorSearch(event.target.value)}
          className="modifier-search-input"
        />

        <button
          type="button"
          disabled={props.disabled}
          onClick={() => props.onChange("")}
        >
          Clear
        </button>

        {filteredModifiers.length === 0 ? (
          <p className="no-search-results">No mutators found.</p>
        ) : null}

        {filteredModifiers.map((mod) => (
          <label key={mod}>
            <input
              type="checkbox"
              disabled={props.disabled}
              checked={selected.includes(mod)}
              onChange={() => props.onChange(toggleMutator(props.value, mod))}
            />
            {mod}
          </label>
        ))}
      </div>
    </details>
  );
}

function MapDropdown(props: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <select
      value={props.value || ""}
      disabled={props.disabled}
      onChange={(event) => props.onChange(event.target.value)}
    >
      <option value="">No Map Selected</option>

      {maps.map((map) => (
        <option key={map} value={map}>
          {map}
        </option>
      ))}
    </select>
  );
}

function SquadDropdown(props: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <select
      value={props.value || ""}
      disabled={props.disabled}
      onChange={(event) => props.onChange(event.target.value)}
    >
      <option value="">Select squad</option>
      {squads.map((squad) => (
        <option key={squad} value={squad}>
          {squad}
        </option>
      ))}
    </select>
  );
}

function SquadCompDropdown(props: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const selected = props.value
    ? props.value.split(",").map((item) => item.trim()).filter(Boolean)
    : [];

  const values = [0, 1, 2, 3].map((index) => selected[index] || "");

  const updateClass = (index: number, value: string) => {
    const next = [...values];
    next[index] = value;
    props.onChange(next.filter(Boolean).join(", "));
  };

  return (
    <div className="squad-comp-grid">
      {values.map((value, index) => (
        <select
          key={index}
          value={value}
          disabled={props.disabled}
          onChange={(event) => updateClass(index, event.target.value)}
        >
          <option value="">Class {index + 1}</option>

          {classOptions.map((className) => (
            <option key={className} value={className}>
              {className}
            </option>
          ))}
        </select>
      ))}
    </div>
  );
}

function DetailsCard(props: {
  fields: string[];
  info: Record<string, string>;
  setInfo: (field: string, value: string) => void;
  disabled?: boolean;
}) {
  return (
    <Card>
      <h3>Details</h3>

      <div className="grid-two">
        {props.fields.map((field) => (
          <label key={field}>
            {field}

            {field === "Map" ? (
              <MapDropdown
                value={props.info[field] || ""}
                disabled={props.disabled}
                onChange={(value) => props.setInfo(field, value)}
              />
            ) : field === "Squad" ? (
              <SquadDropdown
                value={props.info[field] || ""}
                disabled={props.disabled}
                onChange={(value) => props.setInfo(field, value)}
              />
            ) : field === "Mutators" ? (
              <MutatorDropdown
                value={props.info[field] || ""}
                disabled={props.disabled}
                onChange={(value) => props.setInfo(field, value)}
              />
            ) : field === "Squad Comp" ? (
              <SquadCompDropdown
                value={props.info[field] || ""}
                disabled={props.disabled}
                onChange={(value) => props.setInfo(field, value)}
              />
            ) : (
              <input
                value={props.info[field] || ""}
                disabled={props.disabled}
                onChange={(event) => props.setInfo(field, event.target.value)}
              />
            )}
          </label>
        ))}
      </div>
    </Card>
  );
}

function ScoreButtons(props: {
  value: Status;
  onChange: (value: Status) => void;
  disabled?: boolean;
}) {
  const options: Status[] = ["yes", "no", "na"];

  return (
    <div className="score-row">
      {options.map((option) => (
        <Button
          key={option}
          active={props.value === option}
          onClick={() => {
            if (props.disabled) return;
            props.onChange(props.value === option ? "" : option);
          }}
        >
          {option.toUpperCase()}
        </Button>
      ))}
    </div>
  );
}

function ChecklistCard(props: {
  section: Section;
  scores: Record<string, Status>;
  setScore: (id: string, value: Status) => void;
  disabled?: boolean;
}) {
  const got = props.section.items
    .filter((item) => props.scores[item.id] === "yes")
    .reduce((total, item) => total + item.points, 0);

  const max = props.section.items
    .filter((item) => props.scores[item.id] !== "na")
    .reduce((total, item) => total + item.points, 0);

  return (
    <Card>
      <div className="card-title">
        <div>
          <small>Section {props.section.id}</small>
          <h3>{props.section.title}</h3>
        </div>
        <b>{got}/{max}</b>
      </div>

      {props.section.items.map((item, index) => (
        <div key={item.id} className="check-item">
          <div>{index + 1}. {item.text}</div>
          <small>{item.points} pt</small>
          <ScoreButtons
            value={props.scores[item.id] || ""}
            disabled={props.disabled}
            onChange={(value) => props.setScore(item.id, value)}
          />
        </div>
      ))}
    </Card>
  );
}

function TrainerNameSetting() {
  const [trainerName, setTrainerName] = useState(() => {
    return localStorage.getItem(TRAINER_NAME_SAVE_KEY) || "";
  });

  const saveTrainerName = (value: string) => {
    setTrainerName(value);
    localStorage.setItem(TRAINER_NAME_SAVE_KEY, value);

    window.dispatchEvent(
      new CustomEvent("ste-trainer-name-updated", {
        detail: value
      })
    );
  };

  return (
    <Card>
      <h3>Trainer Name Setting</h3>

      <label>
        Trainer Name
        <input
          value={trainerName}
          placeholder="Enter trainer name..."
          onChange={(event) => saveTrainerName(event.target.value)}
        />
      </label>
    </Card>
  );
}

function CertificatePanel(props: { cert: Cert; type: "squad" | "pl" | "builder" }) {
  const [state, setState] = useState<CertState>(defaultCert);
  const [readOnly, setReadOnly] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const trainerName = localStorage.getItem(TRAINER_NAME_SAVE_KEY) || "";

    if (trainerName) {
      setState((old) => ({
        ...old,
        info: {
          ...old.info,
          "Trainer Name": old.info["Trainer Name"] || trainerName
        }
      }));
    }

    const handler = (event: Event) => {
      const trainer = String((event as CustomEvent<string>).detail || "");

      setState((old) => ({
        ...old,
        info: {
          ...old.info,
          "Trainer Name": old.info["Trainer Name"] || trainer
        }
      }));
    };

    window.addEventListener("ste-trainer-name-updated", handler);

    return () => {
      window.removeEventListener("ste-trainer-name-updated", handler);
    };
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      setReadOnly(Boolean((event as CustomEvent<boolean>).detail));
    };

    window.addEventListener("ste-global-save-readonly", handler);

    return () => {
      window.removeEventListener("ste-global-save-readonly", handler);
    };
  }, []);

  const total = earned(props.cert.sections, state.scores);
  const max = possible(props.cert.sections, state.scores);
  const instant = props.cert.fails.some((fail) => state.fails[fail]);
  const result = instant ? "INSTANT FAIL" : total >= props.cert.pass ? "PASS" : "NEEDS WORK";

  const left = props.cert.sections.filter((section) => section.id % 2 === 1);
  const right = props.cert.sections.filter((section) => section.id % 2 === 0);

  const setInfo = (field: string, value: string) => {
    if (readOnly) return;
    setState((old) => ({ ...old, info: { ...old.info, [field]: value } }));
  };

  const setScore = (id: string, value: Status) => {
    if (readOnly) return;
    setState((old) => ({ ...old, scores: { ...old.scores, [id]: value } }));
  };

  const setFail = (fail: string, value: boolean) => {
    if (readOnly) return;
    setState((old) => ({ ...old, fails: { ...old.fails, [fail]: value } }));
  };

  const setMulligan = (note: string, value: boolean) => {
    if (readOnly) return;

    setState((old) => ({
      ...old,
      fails: {
        ...old.fails,
        ["mulligan:" + note]: value
      }
    }));
  };

  const setMulliganNotes = (value: string) => {
    if (readOnly) return;

    setState((old) => ({
      ...old,
      info: {
        ...old.info,
        ["Mulligan / Condition Notes"]: value
      }
    }));
  };

  const openCertificationFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const loaded = JSON.parse(String(reader.result));
        const loadedState: CertState = loaded.certification || loaded.state || loaded;

        setState({
          info: loadedState.info || {},
          scores: loadedState.scores || {},
          fails: loadedState.fails || {},
          notes: loadedState.notes || ""
        });

        if (loaded.tacMap) {
          applyTacMapSnapshot(loaded.tacMap);

          // Force Tac Map tab / overlay to reload the uploaded map data
          window.dispatchEvent(
            new CustomEvent("ste-tac-map-updated", {
              detail: loaded.tacMap
            })
          );
        }

        setReadOnly(true);
        setGlobalSaveReadOnly(false);
      } catch (error) {
        alert("Could not open certification file. Make sure it is a valid exported certification JSON file.");
        console.error(error);
      }
    };

    reader.readAsText(file);
    event.target.value = "";
  };

  const newBlank = () => {
    setState(defaultCert());
    setReadOnly(false);
  };

  return (
    <div className="two-panel">
      <aside>
        <Card>
          <h2>{props.cert.title}</h2>

          {readOnly ? <p className="lock-note">Opened file: read-only</p> : null}

          <div className="big-score">{total}/{max}</div>
            <h3
              className={
                instant
                  ? "instant-fail-text"
                  : result === "NEEDS WORK"
                    ? "needs-work-text"
                    : result === "PASS"
                      ? "pass-text"
                      : ""
              }
            >
              {result}
            </h3>
          <p>Pass: {props.cert.pass}/{props.cert.total}</p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: "none" }}
            onChange={openCertificationFile}
          />

          <div className="grid-two">
            <Button onClick={() => fileInputRef.current?.click()}>Open File</Button>
            <Button onClick={newBlank}>New Blank</Button>

            {!readOnly ? (
              <Button
                onClick={() =>
                  exportJson("STE-" + props.type + "-Certificate.json", {
                    saveType: "certification",
                    certificationType: props.type,
                    certification:
                      props.type === "pl"
                        ? {
                            ...state,
                            info: {
                              ...state.info,
                              Squad: "Demon"
                            }
                          }
                        : state,
                    tacMap: getTacMapSnapshot()
                  })
                }
              >
                Export Save
              </Button>
            ) : null}
          </div>
        </Card>

        <Card>
          <h3>Instant Fails</h3>

          {props.cert.fails.map((fail) => (
            <label key={fail} className="row">
              <input
                type="checkbox"
                disabled={readOnly}
                checked={Boolean(state.fails[fail])}
                onChange={(event) => setFail(fail, event.target.checked)}
              />
              {fail}
            </label>
          ))}
        </Card>

        {props.cert.notes ? (
          <Card>
            <h3>Mulligans / Conditions</h3>

            {props.cert.notes.map((note) => (
              <label key={note} className="row">
                <input
                  type="checkbox"
                  disabled={readOnly}
                  checked={Boolean(state.fails["mulligan:" + note])}
                  onChange={(event) => setMulligan(note, event.target.checked)}
                />
                {note}
              </label>
            ))}

            <h3>Mulligan / Condition Notes</h3>

            <TextBox
              value={state.info["Mulligan / Condition Notes"] || ""}
              disabled={readOnly}
              placeholder="Write mulligan or condition notes here..."
              onChange={setMulliganNotes}
            />
          </Card>
        ) : null}
      </aside>

      <main>
        <DetailsCard
          fields={props.cert.fields}
          info={state.info}
          setInfo={setInfo}
          disabled={readOnly}
        />

        <div className="grid-two">
          <div>
            {left.map((section) => (
              <ChecklistCard
                key={section.id}
                section={section}
                scores={state.scores}
                setScore={setScore}
                disabled={readOnly}
              />
            ))}
          </div>

          <div>
            {right.map((section) => (
              <ChecklistCard
                key={section.id}
                section={section}
                scores={state.scores}
                setScore={setScore}
                disabled={readOnly}
              />
            ))}
          </div>
        </div>

        <Card>
          <h3>Notes</h3>

          <TextBox
            value={state.notes}
            disabled={readOnly}
            onChange={(notes) => {
              if (!readOnly) {
                setState((old) => ({ ...old, notes }));
              }
            }}
          />
        </Card>
      </main>
    </div>
  );
}

function SpecialisationPanel() {
  const [company, setCompany] = useState<Squad>("Demon");
  const [scores, setScores] = useState<Record<string, Status>>({});
  const [info, setInfo] = useState<Record<string, string>>({});

  useEffect(() => {
    const trainerName = localStorage.getItem(TRAINER_NAME_SAVE_KEY) || "";

    if (trainerName) {
      setInfo((old) => ({
        ...old,
        "Trainer Name": old["Trainer Name"] || trainerName
      }));
    }

    const handler = (event: Event) => {
      const trainer = String((event as CustomEvent<string>).detail || "");

      setInfo((old) => ({
        ...old,
        "Trainer Name": old["Trainer Name"] || trainer
      }));
    };

    window.addEventListener("ste-trainer-name-updated", handler);

    return () => {
      window.removeEventListener("ste-trainer-name-updated", handler);
    };
  }, []);
  const [notes, setNotes] = useState("");
  const [mulliganNotes, setMulliganNotes] = useState("");
  const [specFails, setSpecFails] = useState<Record<string, boolean>>({});
  const [readOnly, setReadOnly] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      if (!Boolean((event as CustomEvent<boolean>).detail)) {
        setReadOnly(false);
      }
    };

    window.addEventListener("ste-global-save-readonly", handler);

    return () => {
      window.removeEventListener("ste-global-save-readonly", handler);
    };
  }, []);

  const def = specialisations[company];
  const specItems = def.sections.flatMap((section) => section.items);
  const got = specItems.filter((_, index) => scores[company + "-" + index] === "yes").length;
  const specInstantFail = def.instantFails.some((fail) => specFails[company + ":" + fail]);

  const itemIndex = (sectionIndex: number, innerIndex: number) =>
    def.sections.slice(0, sectionIndex).reduce((sum, section) => sum + section.items.length, 0) + innerIndex;

  const openSpecialisationFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const loaded = JSON.parse(String(reader.result));

        setCompany((loaded.company || "Demon") as Squad);
        setScores(loaded.scores || {});
        setInfo(loaded.info || {});
        setNotes(loaded.notes || "");
        setMulliganNotes(loaded.mulliganNotes || "");
        setSpecFails(loaded.specFails || {});

        if (loaded.tacMap) {
          applyTacMapSnapshot(loaded.tacMap);

          window.dispatchEvent(
            new CustomEvent("ste-tac-map-updated", {
              detail: loaded.tacMap
            })
          );
        }

        setReadOnly(true);
        setGlobalSaveReadOnly(true);
      } catch (error) {
        alert("Could not open specialisation file. Make sure it is a valid exported JSON file.");
        console.error(error);
      }
    };

    reader.readAsText(file);
    event.target.value = "";
  };

  const newBlank = () => {
    setScores({});
    setInfo({});
    setNotes("");
    setMulliganNotes("");
    setSpecFails({});
    setReadOnly(false);
  };

  const setInfoSafe = (field: string, value: string) => {
    if (readOnly) return;

    setInfo((old) => ({
      ...old,
      [field]: value
    }));
  };

  const setScoreSafe = (id: string, value: Status) => {
    if (readOnly) return;

    setScores((old) => ({
      ...old,
      [id]: value
    }));
  };

  return (
    <div className="two-panel">
      <aside>
        <Card>
          <h2>Specialisation Certification</h2>

          {readOnly ? <p className="lock-note">Opened file: read-only</p> : null}

          <label>
            Company
            <select
              value={company}
              disabled={readOnly}
              onChange={(event) => setCompany(event.target.value as Squad)}
            >
              {squads.map((squadName) => (
                <option key={squadName} value={squadName}>
                  {squadName}
                </option>
              ))}
            </select>
          </label>

          <div className="big-score">
            {got}/{def.totalPoints}
          </div>

          <h3
            className={
              specInstantFail
                ? "instant-fail-text"
                : got >= def.passScore
                  ? "pass-text"
                  : "needs-work-text"
            }
          >
            {specInstantFail ? "INSTANT FAIL" : got >= def.passScore ? "PASS" : "NEEDS WORK"}
          </h3>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: "none" }}
            onChange={openSpecialisationFile}
          />

          <div className="grid-two">
            <Button onClick={() => fileInputRef.current?.click()}>Open File</Button>
            <Button onClick={newBlank}>New Blank</Button>

            {!readOnly ? (
              <Button
                onClick={() =>
                  exportJson("STE-Specialisation-" + company + ".json", {
                    saveType: "specialisation",
                    company,
                    scores,
                    info,
                    notes,
                    mulliganNotes,
                    specFails,
                    tacMap: getTacMapSnapshot()
                  })
                }
              >
                Export Save
              </Button>
            ) : null}
          </div>
        </Card>

        <Card>
          <h3>Instant Fails</h3>

          {def.instantFails.map((fail) => {
            const id = company + ":" + fail;

            return (
              <label key={id} className="row">
                <input
                  type="checkbox"
                  disabled={readOnly}
                  checked={Boolean(specFails[id])}
                  onChange={(event) => {
                    if (readOnly) return;

                    setSpecFails((old) => ({
                      ...old,
                      [id]: event.target.checked
                    }));
                  }}
                />
                {fail}
              </label>
            );
          })}
        </Card>

        <Card>
          <h3>Mulligan / Condition Notes</h3>

          <TextBox
            value={mulliganNotes}
            disabled={readOnly}
            placeholder="Write mulligan or condition notes here..."
            onChange={(value) => {
              if (readOnly) return;
              setMulliganNotes(value);
            }}
          />
        </Card>
      </aside>

      <main>
        <DetailsCard
          fields={[
            "Trainer Name",
            "Trainee Name",
            "Map",
            "Platoon Leader",
            "Mutators",
            "Squad Comp",
            "Squad"
          ]}
          info={info}
          setInfo={setInfoSafe}
          disabled={readOnly}
        />

        <div className="grid-two">
          {def.sections.map((section, sectionIndex) => (
            <Card key={section.title}>
              <h3>{section.title}</h3>

              {section.items.map((text, innerIndex) => {
                const index = itemIndex(sectionIndex, innerIndex);
                const id = company + "-" + index;

                return (
                  <div key={id} className="check-item">
                    <b>
                      {index + 1}. {text}
                    </b>

                    <ScoreButtons
                      value={scores[id] || ""}
                      disabled={readOnly}
                      onChange={(value) => setScoreSafe(id, value)}
                    />
                  </div>
                );
              })}
            </Card>
          ))}
        </div>

        <Card>
          <h3>Notes</h3>

          <TextBox
            value={notes}
            disabled={readOnly}
            onChange={(value) => {
              if (!readOnly) setNotes(value);
            }}
          />
        </Card>
      </main>
    </div>
  );
}

function BuilderPanel() {
  return (
    <CertificatePanel
      cert={{
        title: "Builder Certification Checklist",
        fields: builderFields,
        pass: 11,
        total: 32,
        fails: builderFails,
        sections: builderSections,
        notes: builderPass
      }}
      type="builder"
    />
  );
}

function OrdersPanel(props: {
  squad: Squad;
  setSquad: (squad: Squad) => void;
  squadStates: Record<Squad, SquadState>;
  setSquadState: (patch: Partial<SquadState>) => void;
  readOnly?: boolean;
}) {
  const state = props.squadStates[props.squad];
  const checksForSquad = squadOrderChecks[props.squad] || [];

  return (
    <aside>
      <Card>
        <h2>Orders</h2>

        <label>
          Squad
          <select
            value={props.squad}
            onChange={(event) => props.setSquad(event.target.value as Squad)}
          >
            {squads.map((squadName) => (
              <option key={squadName}>{squadName}</option>
            ))}
          </select>
        </label>

        <TextBox
          value={state.orders}
          disabled={props.readOnly}
          onChange={(orders) => {
            if (!props.readOnly) props.setSquadState({ orders });
          }}
          placeholder="Write squad orders..."
        />

        <div className="resource-row">
  <label>
    Ore
    <NumberInput
      value={state.ore}
      disabled={props.readOnly}
      onChange={(ore) => props.setSquadState({ ore })}
    />
  </label>

  <label>
    Gas
    <NumberInput
      value={state.gas}
      disabled={props.readOnly}
      onChange={(gas) => props.setSquadState({ gas })}
    />
  </label>
</div>

        <h3>Squad checklist</h3>

        {checksForSquad.map((check) => {
          const checkKey = props.squad + ":" + check;

          return (
            <label key={checkKey} className="row">
              <input
                type="checkbox"
                disabled={props.readOnly}
                checked={Boolean(state.checks[checkKey])}
                onChange={(event) => {
                  if (props.readOnly) return;

                  props.setSquadState({
                    checks: {
                      ...state.checks,
                      [checkKey]: event.target.checked
                    }
                  });
                }}
              />
              {check}
            </label>
          );
        })}
      </Card>
    </aside>
  );
}

function OperationPanel(props: {
  playerCount: number;
  setPlayerCount: (value: number) => void;
  modifiers: string[];
  setModifiers: (value: string[]) => void;
  notes: string;
  setNotes: (value: string) => void;
  exportOperation: () => void | Promise<void>;
  openOperation: () => void;
  operationRunning: boolean;
  setOperationRunning: (value: boolean) => void;
  operationStartedAt: string;
  setOperationStartedAt: (value: string) => void;
  readOnly?: boolean;
}) {

  const [operationModifierSearch, setOperationModifierSearch] = useState("");

  const filteredOperationModifiers = modifiers.filter((mod) =>
    mod.toLowerCase().includes(operationModifierSearch.trim().toLowerCase())
  );

  const startOperation = () => {
    if (props.readOnly) return;
    props.setOperationRunning(true);
    props.setOperationStartedAt(new Date().toLocaleString());
  };

  return (
    <aside>
      <Card>
        <h2>Operation</h2>

        <p><b>Status:</b> {props.operationRunning ? "Running" : "Stopped"}</p>
        <p><b>Started:</b> {props.operationStartedAt || "Not started"}</p>
        <p><b>Players:</b> {props.playerCount}/16</p>

        <div className="grid-two">
          <Button
            disabled={props.readOnly}
            active={props.operationRunning}
            onClick={startOperation}
          >
            Start Operation
          </Button>

          <Button
            disabled={props.readOnly}
            active={!props.operationRunning}
            onClick={() => props.setOperationRunning(false)}
          >
            Stop Operation
          </Button>
        </div>

        <div className="score-row">
          <Button
            disabled={props.readOnly}
            onClick={() => props.setPlayerCount(Math.max(12, props.playerCount - 1))}
          >
            -
          </Button>

          <NumberInput
            value={props.playerCount}
            disabled={props.readOnly}
            onChange={(value) => props.setPlayerCount(Math.min(16, Math.max(12, value)))}
          />

          <Button
            disabled={props.readOnly}
            onClick={() => props.setPlayerCount(Math.min(16, props.playerCount + 1))}
          >
            +
          </Button>
        </div>

        <div className="grid-two">
          <Button onClick={props.openOperation}>Open Save</Button>
          <Button disabled={props.readOnly} onClick={props.exportOperation}>
            Export Save
          </Button>
          <Button disabled={props.readOnly} onClick={() => props.setPlayerCount(12)}>
            Reset
          </Button>
        </div>

        <h3>Modifiers</h3>

        <details className="dropdown">
          <summary>
            {props.modifiers.length ? props.modifiers.join(", ") : "Select operation modifiers"}
          </summary>

          <div className="dropdown-menu">
            <input
              type="text"
              value={operationModifierSearch}
              placeholder="Search modifiers..."
              disabled={props.readOnly}
              onChange={(event) => setOperationModifierSearch(event.target.value)}
              className="modifier-search-input"
            />

            <button
              type="button"
              disabled={props.readOnly}
              onClick={() => props.setModifiers([])}
            >
              Clear
            </button>

            {filteredOperationModifiers.length === 0 ? (
              <p className="no-search-results">No modifiers found.</p>
            ) : null}

            {filteredOperationModifiers.map((mod) => (
              <label key={mod}>
                <input
                  type="checkbox"
                  disabled={props.readOnly}
                  checked={props.modifiers.includes(mod)}
                  onChange={() => {
                    if (props.readOnly) return;
                    props.setModifiers(
                      props.modifiers.includes(mod)
                        ? props.modifiers.filter((item) => item !== mod)
                        : [...props.modifiers, mod]
                    );
                  }}
                />
                {mod}
              </label>
            ))}
          </div>
        </details>

        <TextBox
          value={props.notes}
          disabled={props.readOnly}
          onChange={(value) => {
            if (!props.readOnly) props.setNotes(value);
          }}
          placeholder="Operation notes..."
        />
      </Card>
    </aside>
  );
}

function TacMapPanel(props: { readOnly?: boolean; overlayMode?: boolean }) {
  const [mapName, setMapName] = useState("");
  const [boreasLevel, setBoreasLevel] = useState("Plateau");
  const [showOrders, setShowOrders] = useState(true);
  const [showOps, setShowOps] = useState(true);
  const [activeMarker, setActiveMarker] = useState<MarkerType | "">("");
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [showBugHoles, setShowBugHoles] = useState(false);
  const [activeMods, setActiveMods] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [operationRunning, setOperationRunning] = useState(false);
  const [operationStartedAt, setOperationStartedAt] = useState("");
  const [playerCount, setPlayerCount] = useState(12);
  const [squad, setSquad] = useState<Squad>("Demon");
  const [squadStates, setSquadStates] = useState(defaultSquads);

  const [saveName, setSaveName] = useState("");
  const [showSaveNameModal, setShowSaveNameModal] = useState(false);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const operationFileInputRef = useRef<HTMLInputElement | null>(null);
  const [tacMapLoaded, setTacMapLoaded] = useState(false);

  const activeMapKey = mapName
    ? mapName === "Boreas"
      ? "Boreas " + boreasLevel
      : mapName
    : "";

  const activeMapPath = activeMapKey
    ? mapAssetPaths[activeMapKey] || mapAssetPaths[mapName]
    : "";

  const activeBugHolePath = activeMapKey
    ? bugHoleMapPaths[activeMapKey] || bugHoleMapPaths[mapName]
    : "";

  const visibleMarkers = useMemo(
    () => markers.filter((marker) => marker.map === activeMapKey),
    [markers, activeMapKey]
  );

  const tacMapSave = {
    mapName,
    activeMapKey,
    boreasLevel,
    showBugHoles,
    operationRunning,
    operationStartedAt,
    playerCount,
    notes,
    modifiers: activeMods,
    markers,
    squadStates,
    mapPath: activeMapKey
      ? mapAssetPaths[activeMapKey] || mapAssetPaths[mapName]
      : "",
    bugHoleMapPath: activeBugHolePath
  };
  const loadTacMapData = (snapshot: any) => {
  if (!snapshot) return;

  if (typeof snapshot.mapName === "string") setMapName(snapshot.mapName);
  if (typeof snapshot.boreasLevel === "string") setBoreasLevel(snapshot.boreasLevel);
  if (typeof snapshot.showBugHoles === "boolean") setShowBugHoles(snapshot.showBugHoles);
  if (typeof snapshot.operationRunning === "boolean") setOperationRunning(snapshot.operationRunning);
  if (typeof snapshot.operationStartedAt === "string") setOperationStartedAt(snapshot.operationStartedAt);
  if (typeof snapshot.playerCount === "number") setPlayerCount(snapshot.playerCount);
  if (typeof snapshot.notes === "string") setNotes(snapshot.notes);
  if (Array.isArray(snapshot.modifiers)) setActiveMods(snapshot.modifiers);
  if (Array.isArray(snapshot.markers)) setMarkers(snapshot.markers);
  if (snapshot.squadStates) setSquadStates(snapshot.squadStates);
};

  const loadTacMapSnapshot = () => {
    const snapshot = getTacMapSnapshot();
    loadTacMapData(snapshot);
  };

  useEffect(() => {
    loadTacMapSnapshot();
    setTacMapLoaded(true);

    const reloadSnapshot = (event?: Event) => {
      const directSnapshot = (event as CustomEvent<any> | undefined)?.detail;

      if (directSnapshot) {
        loadTacMapData(directSnapshot);
        return;
      }

      loadTacMapSnapshot();
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === TAC_MAP_SAVE_KEY) {
        loadTacMapSnapshot();
      }
    };

    let channel: BroadcastChannel | null = null;

    try {
      channel = new BroadcastChannel("ste-tac-map-channel");

      channel.onmessage = (event) => {
        if (event.data) {
          loadTacMapData(event.data);
          return;
        }

        loadTacMapSnapshot();
      };
    } catch {
      channel = null;
    }

    window.addEventListener("ste-tac-map-updated", reloadSnapshot);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("ste-tac-map-updated", reloadSnapshot);
      window.removeEventListener("storage", handleStorage);

      if (channel) {
        channel.close();
      }
    };
  }, []);

  useEffect(() => {
    if (!tacMapLoaded) return;

    // Silent save only. Do not broadcast every auto-save or the map dropdown can reload/freeze.
    saveTacMapSnapshot(tacMapSave, false);
  }, [
  tacMapLoaded,
    mapName,
    activeMapKey,
    boreasLevel,
    showBugHoles,
    operationRunning,
    operationStartedAt,
    playerCount,
    notes,
    activeMods,
    markers,
    squadStates,
    activeBugHolePath
  ]);

  const saveCurrentTacMap = (nextMarkers = markers) => {
    saveTacMapSnapshot(
      {
        ...tacMapSave,
        markers: nextMarkers
      },
      false
    );
  };
  const setSquadState = (patch: Partial<SquadState>) => {
    if (props.readOnly) return;

      setSquadStates((old) => ({
        ...old,
        [squad]: {
          ...old[squad],
          ...patch
        }
      }));
  };

  const zoomMap = (event: React.WheelEvent<HTMLDivElement>) => {
  event.preventDefault();
  event.stopPropagation();

  const delta = event.deltaY < 0 ? 0.2 : -0.2;

  setZoom((oldZoom) => {
    const nextZoom = Math.min(4, Math.max(1, Number((oldZoom + delta).toFixed(2))));

    if (nextZoom <= 1) {
      setPan({ x: 0, y: 0 });
      return 1;
    }

    return nextZoom;
  });
};

  const startPan = (event: React.MouseEvent<HTMLDivElement>) => {
    if (props.readOnly) return;
    if (zoom <= 1) return;
    if (activeMarker) return;

    setIsPanning(true);
    setPanStart({
      x: event.clientX - pan.x,
      y: event.clientY - pan.y
    });
  };

  const movePan = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isPanning) return;

    setPan({
      x: event.clientX - panStart.x,
      y: event.clientY - panStart.y
    });
  };

  const stopPan = () => {
    setIsPanning(false);
  };

  const resetMapView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setIsPanning(false);
  };

const addMarker = (event: React.MouseEvent<HTMLDivElement>) => {
  if (props.readOnly) return;
  if (!activeMarker) return;

  if (!activeMapKey) {
    alert("Select a map before placing markers.");
    return;
  }

  if (isPanning) return;

  const rect = event.currentTarget.getBoundingClientRect();

  const x = ((event.clientX - rect.left) / rect.width) * 100;
  const y = ((event.clientY - rect.top) / rect.height) * 100;

  if (x < 0 || x > 100 || y < 0 || y > 100) return;

  const newMarker: Marker = {
    id: String(Date.now()),
    type: activeMarker,
    x,
    y,
    map: activeMapKey
  };

  setMarkers((old) => {
    const nextMarkers = [...old, newMarker];
    saveCurrentTacMap(nextMarkers);
    return nextMarkers;
  });
};

  const openOperationFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const loaded = JSON.parse(String(reader.result));
        const loadedTacMap = loaded.tacMap || loaded;

        if (typeof loadedTacMap.mapName === "string") setMapName(loadedTacMap.mapName);
        if (typeof loadedTacMap.boreasLevel === "string") setBoreasLevel(loadedTacMap.boreasLevel);
        if (typeof loadedTacMap.showBugHoles === "boolean") setShowBugHoles(loadedTacMap.showBugHoles);
        if (typeof loadedTacMap.operationRunning === "boolean") setOperationRunning(loadedTacMap.operationRunning);
        if (typeof loadedTacMap.operationStartedAt === "string") setOperationStartedAt(loadedTacMap.operationStartedAt);
        if (typeof loadedTacMap.playerCount === "number") setPlayerCount(loadedTacMap.playerCount);
        if (typeof loadedTacMap.notes === "string") setNotes(loadedTacMap.notes);
        if (Array.isArray(loadedTacMap.modifiers)) setActiveMods(loadedTacMap.modifiers);
        if (Array.isArray(loadedTacMap.markers)) setMarkers(loadedTacMap.markers);
        if (loadedTacMap.squadStates) setSquadStates(loadedTacMap.squadStates);

        saveTacMapSnapshot(loadedTacMap);
        window.dispatchEvent(
          new CustomEvent("ste-tac-map-updated", {
            detail: loadedTacMap
          })
        );
      } catch (error) {
        alert("Could not open operation save. Make sure it is a valid STE operation JSON file.");
        console.error(error);
      }
    };

    reader.readAsText(file);
    event.target.value = "";
  };

  const openOperationPicker = () => {
    operationFileInputRef.current?.click();
  };

  const resetTacMap = () => {
    if (props.readOnly) return;

    const resetMapName = "";
    const resetBoreasLevel = "Plateau";
    const resetActiveMapKey = "";
    const resetSquadStates = defaultSquads();

    setMapName(resetMapName);
    setBoreasLevel(resetBoreasLevel);
    setShowOrders(true);
    setShowOps(true);
    setActiveMarker("");
    setMarkers([]);
    setShowBugHoles(false);
    setActiveMods([]);
    setNotes("");
    setOperationRunning(false);
    setOperationStartedAt("");
    setPlayerCount(12);
    setSquad("Demon");
    setSquadStates(resetSquadStates);
    resetMapView();

    saveTacMapSnapshot({
      mapName: resetMapName,
      activeMapKey: resetActiveMapKey,
      boreasLevel: resetBoreasLevel,
      showBugHoles: false,
      operationRunning: false,
      operationStartedAt: "",
      playerCount: 12,
      notes: "",
      modifiers: [],
      markers: [],
      squadStates: resetSquadStates,
      bugHoleMapPath: ""
    });
  };

  const clearCurrentLevelMarkers = () => {
    if (props.readOnly) return;

    setMarkers((old) => {
      const nextMarkers = old.filter((marker) => marker.map !== activeMapKey);
      saveCurrentTacMap(nextMarkers);
      return nextMarkers;
    });
  };

  const columns = [showOrders ? "280px" : "", "1fr", showOps ? "320px" : ""]
    .filter(Boolean)
    .join(" ");
  const mapCanvasBackgroundStyle: React.CSSProperties = {
    height: props.overlayMode ? "680px" : "680px",
    maxHeight: props.overlayMode ? "calc(100vh - 95px)" : "calc(100vh - 110px)",
    backgroundColor: "#000000",
    backgroundImage: "none",
    border: "2px solid var(--accent)",
    borderRadius: "14px",
    overflow: "hidden",
    position: "relative",

    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  };

  return (
    <div className={props.overlayMode ? "overlay-map-page" : ""}>
      <input
        ref={operationFileInputRef}
        type="file"
        accept=".json,application/json"
        style={{ display: "none" }}
        onChange={openOperationFile}
      />

      <div className="toolbar">
        <select
          value={mapName}
          disabled={props.readOnly}
          onChange={(event) => {
            setMapName(event.target.value);
            setShowBugHoles(false);
            resetMapView();
          }}
        >
          <option value="">No Map Selected</option>

          {maps.map((map) => (
            <option key={map} value={map}>
              {map}
            </option>
          ))}
        </select>

        {mapName === "Boreas" ? (
          <select
            value={boreasLevel}
            disabled={props.readOnly}
            onChange={(event) => {
              setBoreasLevel(event.target.value);
              resetMapView();
            }}
          >
            {boreasLevels.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        ) : null}

        <Button
          disabled={props.readOnly || !activeMapKey}
          active={showBugHoles}
          onClick={() => setShowBugHoles(!showBugHoles)}
        >
          Bug Holes
        </Button>

        <Button active={showOrders} onClick={() => setShowOrders(!showOrders)}>
          Orders
        </Button>

        <Button active={showOps} onClick={() => setShowOps(!showOps)}>
          Operation
        </Button>

        <Button onClick={resetMapView}>
          Reset View
        </Button>

        <Button disabled={props.readOnly || !activeMapKey} onClick={clearCurrentLevelMarkers}>
          Clear Level
        </Button>

        <Button disabled={props.readOnly} onClick={resetTacMap}>
          Reset Tac Map
        </Button>

        <select
          value={activeMarker}
          disabled={props.readOnly || !activeMapKey}
          onChange={(event) => setActiveMarker(event.target.value as MarkerType | "")}
        >
          <option value="">Select marker</option>

          {markerTypes.map((marker) => (
            <option key={marker.id} value={marker.id}>
              {marker.label}
            </option>
          ))}
        </select>
      </div>

      <div
        className="map-grid"
        style={{
          gridTemplateColumns: columns
        }}
      >
        {showOrders ? (
          <OrdersPanel
            squad={squad}
            setSquad={setSquad}
            squadStates={squadStates}
            setSquadState={setSquadState}
            readOnly={props.readOnly}
          />
        ) : null}

        <main>
          <div
            className="map-canvas"
            style={mapCanvasBackgroundStyle}
            onWheelCapture={zoomMap}
          >
            {!activeMapKey ? (
              <div className="no-map-only">
                <img
                  src={appAsset("assets/backgrounds/no-map-selected.png")}
                  alt=""
                  className="no-map-background"
                  draggable={false}
                />
              </div>
            ) : (
              <div
                className={"map-stage " + (!activeMapKey ? "no-active-map-stage" : "")}
                onMouseDown={startPan}
                onMouseMove={movePan}
                onMouseUp={stopPan}
                onMouseLeave={stopPan}
                onClick={addMarker}
              style={{
                position: "relative",
                width: "min(100%, 620px)",
                height: "min(100%, 620px)",
                aspectRatio: "1 / 1",
                flex: "0 0 auto",
                overflow: "visible",
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: "center center",
                cursor:
                  activeMarker && activeMapKey
                    ? "crosshair"
                    : zoom > 1
                      ? "grab"
                      : "default"
              }}
              >
            <img
              src={appAsset(activeMapPath)}
              alt={activeMapKey}
              className="map-image"
              draggable={true}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "fill",
                pointerEvents: "none",
                zIndex: 1
              }}
            />

                {showBugHoles && activeBugHolePath ? (
                  <img
                    src={appAsset(activeBugHolePath)}
                    alt={activeMapKey + " bug holes"}
                    className="bughole-layer"
                    draggable={false}
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "fill",
                      pointerEvents: "none",
                      zIndex: 2
                    }}
                  />
                ) : null}

                {visibleMarkers.map((marker) => {
                  const markerDef = markerTypes.find((item) => item.id === marker.type);

                  return (
                    <button
                      key={marker.id}
                      type="button"
                      className="map-marker"
                      disabled={props.readOnly}
                      title={markerDef?.label || marker.type}
                      style={{
                        position: "absolute",
                        left: marker.x + "%",
                        top: marker.y + "%",
                        width: "20px",
                        height: "20px",
                        transform: "translate(-50%, -50%)",
                        borderRadius: "999px",
                        overflow: "hidden",
                        padding: 0,
                        zIndex: 20,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "rgba(0, 0, 0, 0.9)",
                        border: "1px solid #f5a400",
                        boxShadow: "0 0 4px rgba(0, 0, 0, 0.9)",
                        cursor: "pointer"
                      }}
                      onClick={(event) => {
                        event.stopPropagation();

                        if (props.readOnly) return;

                        setMarkers((old) => {
                          const nextMarkers = old.filter((item) => item.id !== marker.id);
                          saveCurrentTacMap(nextMarkers);
                          return nextMarkers;
                        });
                      }}
                    >
                      {markerDef?.path ? (
                        <img
                          src={appAsset(markerDef.path)}
                          alt={markerDef.label}
                          draggable={false}
                        />
                      ) : (
                        markerDef?.label || marker.type
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="zoom-controls">
            <Button onClick={() => setZoom((old) => Math.min(4, old + 0.25))}>
              +
            </Button>

            <Button
              onClick={() =>
                setZoom((old) => {
                  const nextZoom = Math.max(1, old - 0.25);

                  if (nextZoom <= 1) {
                    setPan({ x: 0, y: 0 });
                    return 1;
                  }

                  return nextZoom;
                })
              }
            >
              -
            </Button>

            <Button onClick={resetMapView}>
              Reset
            </Button>
          </div>
      </main>

        {showOps ? (
          <OperationPanel
            playerCount={playerCount}
            setPlayerCount={setPlayerCount}
            modifiers={activeMods}
            setModifiers={setActiveMods}
            notes={notes}
            setNotes={setNotes}
            operationRunning={operationRunning}
            setOperationRunning={setOperationRunning}
            operationStartedAt={operationStartedAt}
            setOperationStartedAt={setOperationStartedAt}
            openOperation={openOperationPicker}
            exportOperation={() => setShowSaveNameModal(true)}
            readOnly={props.readOnly}
          />
        ) : null}

        {showSaveNameModal ? (
          <div className="modal-backdrop">
            <div className="modal-box">
              <h2>Name Operation Save</h2>

              <input
                type="text"
                value={saveName}
                onChange={(event) => setSaveName(event.target.value)}
                placeholder="Enter save name..."
                className="save-name-input"
                autoFocus
              />

              <div className="modal-actions">
                <Button
                  onClick={() => {
                    const trimmedName = saveName.trim();

                    if (!trimmedName) {
                      alert("Please enter a save name.");
                      return;
                    }

                    const currentActiveMapKey = mapName
                      ? mapName === "Boreas"
                        ? "Boreas " + boreasLevel
                        : mapName
                      : "";

                    const currentTacMapSave = {
                      mapName,
                      activeMapKey: currentActiveMapKey,
                      boreasLevel,
                      showBugHoles,
                      operationRunning,
                      operationStartedAt,
                      playerCount,
                      notes,
                      modifiers: activeMods,
                      markers,
                      squadStates,
                      mapPath: currentActiveMapKey
                        ? mapAssetPaths[currentActiveMapKey] || mapAssetPaths[mapName]
                        : "",
                      bugHoleMapPath: currentActiveMapKey
                        ? bugHoleMapPaths[currentActiveMapKey] || bugHoleMapPaths[mapName]
                        : ""
                    };

                    saveTacMapSnapshot(currentTacMapSave);

                    exportJson(safeName(trimmedName) + ".json", {
                      saveType: "operation",
                      saveName: trimmedName,
                      createdAt: new Date().toISOString(),
                      tacMap: currentTacMapSave
                    });

                    setShowSaveNameModal(false);
                    setSaveName("");
                  }}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

type MeritAward = {
  name: string;
  description: string;
  target: number;
  unit: string;
  inputs?: string[];
};

const meritAwards: MeritAward[] = [
  { name: "Larvacide", target: 40000, unit: "Drone kills", description: "Awarded for killing 40,000 Drones over your career." },
  { name: "Gunning for You", target: 2000, unit: "Gunner kills", description: "Awarded for killing 2,000 Gunners over your career." },
  { name: "Roly Poly Killer", target: 500, unit: "Bombardier kills", description: "Awarded for killing 500 Bombardiers over your career." },
  { name: "Tiger King", target: 2000, unit: "Tiger kills", description: "Awarded for killing 2,000 Tigers over your career." },
  { name: "Grena-Gone", target: 1000, unit: "Grenadier kills", description: "Awarded for killing 1,000 Grenadiers over your career." },
  { name: "Disco Inferno", target: 1000, unit: "Inferno kills", description: "Awarded for killing 1,000 Infernos over your career." },
  { name: "Court's Jester", target: 250, unit: "Royal Guard / Elite Royal Guard kills", description: "Awarded for killing 250 Royal Guards and/or Elite Royal Guards over your career." },
  { name: "Tank You Very Much", target: 50, unit: "Tanker kills", description: "Awarded for killing 50 Tankers over your career." },
  { 
    name: "Mad Hatter",
    target: 333,
    unit: "Fabricator kills",
    description: "Awarded upon achieving 333 cumulative kills with Fabricators.",
    inputs: ["Fabricator 1", "Fabricator 2", "Fabricator 3"]
  },

  { name: "Destroyer of Bugs", target: 300000, unit: "confirmed kills", description: "Awarded for achieving 300,000 confirmed kills over your career." },
  { name: "Now I am become Death", target: 150000, unit: "confirmed kills", description: "Awarded for achieving 150,000 confirmed kills over your career." },
  { name: "Conquest Incarnate", target: 75000, unit: "confirmed kills", description: "Awarded for achieving 75,000 confirmed kills over your career." },

  { name: "Molehill of Warriors", target: 60000, unit: "any Warrior kills", description: "Awarded for killing any 60,000 Warriors over your career." },
  { name: "Dune of Warriors", target: 20000, unit: "regular Warrior kills", description: "Awarded for killing 20,000 regular Warriors over your career." },
  { name: "Volcano of Warriors", target: 20000, unit: "Fire Warrior kills", description: "Awarded for killing 20,000 Fire Warriors over your career." },
  { name: "Avalanche of Warriors", target: 20000, unit: "Frost Warrior kills", description: "Awarded for killing 20,000 Frost Warriors over your career." },

    {
    name: "OUS Trooper",
    target: 2000,
    unit: "Guardian UAV / Portable Sentry Turret kills",
    description: "Awarded upon achieving 2,000 cumulative kills with the Guardian UAV, and Portable Sentry Turret.",
    inputs: ["Guardian UAV", "Portable Sentry Turret"]
  },

    {
     name: "OUS Proficiency Ribbon",
     target: 1000,
     unit: "Guardian UAV / Portable Sentry Turret kills",
      description: "Awarded upon achieving 1,000 cumulative kills with the Guardian UAV, and Portable Sentry Turret.",
     inputs: ["Guardian UAV", "Portable Sentry Turret"]
  },

  { 
    name: "Ordnance Trooper",
    target: 2000,
    unit: "grenade variant kills",
    description: "Awarded upon achieving 2,000 cumulative kills with the variants of the grenade.",
    inputs: ["Grenade 1", "Grenade 2", "Grenade 3", "Grenade 4", "Grenade 5", "Grenade 6", "Grenade 7"]
  },

  { 
    name: "Ordnance Proficiency Ribbon",
    target: 1000,
    unit: "grenade variant kills",
    description: "Awarded upon achieving 1,000 cumulative kills with the variants of the grenade.",
    inputs: ["Grenade 1", "Grenade 2", "Grenade 3", "Grenade 4", "Grenade 5", "Grenade 6", "Grenade 7"]
  },

 { 
    name: "Heavy Ordnance Trooper",
    target: 2000,
    unit: "mine / thermo / nuclear det pack kills",
    description: "Awarded upon achieving 2,000 cumulative kills with the Proximity Bug Mine, Thermo Charge, and Nuclear Det Pack.",
    inputs: ["Proximity Bug Mine", "Thermo Charge", "Nuclear Det Pack"]
  },
  { 
    name: "Heavy Ordnance Proficiency Ribbon",
    target: 1000,
    unit: "mine / thermo / nuclear det pack kills",
    description: "Awarded upon achieving 1,000 cumulative kills with the Proximity Bug Mine, Thermo Charge, and Nuclear Det Pack.",
    inputs: ["Proximity Bug Mine", "Thermo Charge", "Nuclear Det Pack"]
  },

  { 
    name: "RPG Trooper",
    target: 2000,
    unit: "rocket launcher kills",
    description: "Awarded upon achieving 2,000 cumulative kills with the M-56 Pilum Rocket Launcher and M-55 Rocket Launcher.",
    inputs: ["M-56 Pilum", "M-55 Rocket Launcher"]
  },
  { 
    name: "RPG Proficiency Ribbon",
    target: 1000,
    unit: "rocket launcher kills",
    description: "Awarded upon achieving 1,000 cumulative kills with the M-56 Pilum Rocket Launcher and M-55 Rocket Launcher.",
    inputs: ["M-56 Pilum", "M-55 Rocket Launcher"]
  },

  { name: "Emplacement Trooper", target: 3000, unit: "Twin MG kills", description: "Awarded upon achieving 3,000 cumulative kills with the Twin MG." },
  { name: "Emplacement Proficiency Ribbon", target: 1500, unit: "Twin MG kills", description: "Awarded upon achieving 1,500 cumulative kills with the Twin MG." },

  { 
    name: "The Steel Path Trooper",
    target: 2000,
    unit: "melee kills",
    description: "Awarded upon achieving 2,000 cumulative kills with any melee instrument.",
    inputs: ["Melee"]
  },
  { 
    name: "The Steel Path Ribbon",
    target: 1000,
    unit: "melee kills",
    description: "Awarded upon achieving 1,000 cumulative kills with any melee instrument.",
    inputs: ["Melee"]
  },

  { name: "Resilient Trooper", target: 500, unit: "successful extractions", description: "Awarded for successfully extracting 500 times over your career." },
  { name: "Ribbon of Resilience", target: 250, unit: "successful extractions", description: "Awarded for successfully extracting 250 times over your career." },

  { name: "Expeditionary Trooper", target: 500, unit: "victories", description: "Awarded for 500 victories over your career." },
  { name: "Expeditionary Ribbon", target: 250, unit: "victories", description: "Awarded for 250 victories over your career." }
];

const registerOnlyAwards: MeritAward[] = [
  {
    name: "E-Pulse Proficiency Ribbon",
    target: 0,
    unit: "manual award",
    description: "Awarded upon achieving at least level 5 with the E-Pulse 44 A2, E-Pulse 88 CSW, and E-Pulse Pistol A1."
  },
  {
    name: "Boomstick Trooper",
    target: 0,
    unit: "manual award",
    description: "Awarded upon achieving level 10 with all the TW-2 SP.L.I.T. Shotguns."
  },
  {
    name: "Boomstick Proficiency Ribbon",
    target: 0,
    unit: "manual award",
    description: "Awarded upon achieving at least level 5 with all the TW-2 SP.L.I.T. Shotguns."
  },
  {
    name: "Sharpshooter Trooper",
    target: 0,
    unit: "manual award",
    description: "Awarded upon achieving level 10 with the Morita XXX Sniper Rifle, and TW 202-L Morita Hawkeye."
  },
  {
    name: "Sharpshooter Proficiency Ribbon",
    target: 0,
    unit: "manual award",
    description: "Awarded upon achieving at least level 5 with the Morita XXX Sniper Rifle, and TW 202-L Morita Hawkeye."
  },
  {
    name: "Support Trooper",
    target: 0,
    unit: "manual award",
    description: "Awarded upon achieving level 10 with the Morita MK3 SAW, C-32 Chi-Hong Grenade Launcher, and FU-17 Flamethrower."
  },
  {
    name: "Support Proficiency Ribbon",
    target: 0,
    unit: "manual award",
    description: "Awarded upon achieving at least level 5 with the Morita MK3 SAW, C-32 Chi-Hong Grenade Launcher, and FU-17 Flamethrower."
  },
  {
    name: "The Steel Path Trooper",
    target: 0,
    unit: "manual award",
    description: "Awarded upon achieving 2,000 cumulative kills with any melee instrument."
  },
  {
    name: "The Steel Path Ribbon",
    target: 0,
    unit: "manual award",
    description: "Awarded upon achieving 1,000 cumulative kills with any melee instrument."
  },
  {
    name: "Quickdraw Trooper",
    target: 0,
    unit: "manual award",
    description: "Awarded upon achieving level 10 with the TW-102-s Peacemaker, TW-109-e Emancipator, and TW-7 Liberator."
  },
  {
    name: "Quickdraw Proficiency Ribbon",
    target: 0,
    unit: "manual award",
    description: "Awarded upon achieving at least level 5 with the TW-102-s Peacemaker, TW-109-e Emancipator, and TW-7 Liberator."
  },
  {
    name: "Assault Trooper",
    target: 0,
    unit: "manual award",
    description: "Awarded upon achieving level 10 with the Morita MK1, Morita II, Morita MK1 Carbine, and TDW-99 Morita Tactical SMG."
  },
  {
    name: "Assault Proficiency Ribbon",
    target: 0,
    unit: "manual award",
    description: "Awarded upon achieving at least level 5 with the Morita MK1, Morita II, Morita MK1 Carbine, and TDW-99 Morita Tactical SMG."
  },
  {
    name: "E-Pulse Trooper",
    target: 0,
    unit: "manual award",
    description: "Awarded upon achieving level 10 with the E-Pulse 44 A2, E-Pulse 88 CSW, and E-Pulse Pistol A1."
  },
  {
    name: "Master At Arms",
    target: 0,
    unit: "manual award",
    description: "Awarded to Troopers who master all forms of combat. Awarded for getting all Trooper Ribbons."
  }
];

const awardRegisterItems: MeritAward[] = Array.from(
  new Map(
    [...meritAwards, ...registerOnlyAwards].map((item) => [item.name, item])
  ).values()
);

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const exportMeritCertificate = (data: {
  recipient: string;
  rank: string;
  award: string;
  reason: string;
  presentedBy: string;
  notes: string;
}) => {
  const recipient = escapeHtml(data.recipient || "Trooper");
  const rank = escapeHtml(data.rank || "");
  const award = escapeHtml(data.award || "Merit / Award");
  const reason = escapeHtml(data.reason || "For outstanding service, dedication, and contribution to the 1st M.I.");
  const presentedBy = escapeHtml(data.presentedBy || "Command");
  const notes = escapeHtml(data.notes || "");
  const date = new Date().toLocaleDateString();

  const certificateHtml = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${award} Certificate</title>

  <style>
    @page {
      size: A4 landscape;
      margin: 0;
    }

    body {
      margin: 0;
      background: #000;
      color: white;
      font-family: Georgia, "Times New Roman", serif;
    }

    .certificate {
      width: 297mm;
      height: 210mm;
      box-sizing: border-box;
      padding: 18mm;
      background:
        radial-gradient(circle at center, rgba(0, 255, 94, 0.16), rgba(0, 0, 0, 0.96) 58%),
        linear-gradient(135deg, #020617, #000000);
      position: relative;
      overflow: hidden;
    }

    .border-outer {
      position: absolute;
      inset: 9mm;
      border: 3px solid #00ff5e;
      box-shadow: 0 0 24px rgba(0, 255, 94, 0.55);
    }

    .border-inner {
      position: absolute;
      inset: 14mm;
      border: 1px solid rgba(255, 255, 255, 0.35);
    }

    .content {
      position: relative;
      z-index: 2;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      justify-content: center;
    }

    .unit {
      font-size: 18px;
      letter-spacing: 5px;
      color: #00ff5e;
      text-transform: uppercase;
      margin-bottom: 12px;
      font-family: Arial, sans-serif;
      font-weight: 800;
    }

    .title {
      font-size: 54px;
      line-height: 1;
      color: #ffffff;
      text-transform: uppercase;
      margin: 0;
      text-shadow: 0 0 16px rgba(0, 255, 94, 0.55);
    }

    .subtitle {
      font-size: 20px;
      margin-top: 10px;
      color: #cbd5e1;
      letter-spacing: 2px;
      text-transform: uppercase;
      font-family: Arial, sans-serif;
    }

    .presented {
      margin-top: 28px;
      font-size: 19px;
      color: #cbd5e1;
    }

    .recipient {
      margin-top: 10px;
      font-size: 42px;
      color: #00ff5e;
      font-weight: 900;
      text-shadow: 0 0 12px rgba(0, 255, 94, 0.5);
    }

    .rank {
      margin-top: 4px;
      font-size: 22px;
      color: #e5e7eb;
    }

    .award {
      margin-top: 28px;
      font-size: 32px;
      color: #ffffff;
      font-weight: 900;
      text-transform: uppercase;
    }

    .reason {
      margin-top: 18px;
      max-width: 225mm;
      font-size: 20px;
      line-height: 1.45;
      color: #e5e7eb;
    }

    .notes {
      margin-top: 10px;
      max-width: 220mm;
      font-size: 14px;
      color: #94a3b8;
      font-family: Arial, sans-serif;
    }

    .footer {
      position: absolute;
      left: 28mm;
      right: 28mm;
      bottom: 24mm;
      display: flex;
      justify-content: space-between;
      gap: 30mm;
      font-family: Arial, sans-serif;
      color: #e5e7eb;
      z-index: 3;
    }

    .sig {
      flex: 1;
      text-align: center;
      border-top: 1px solid rgba(255, 255, 255, 0.65);
      padding-top: 8px;
      font-size: 13px;
    }

    .watermark {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 120px;
      font-family: Arial, sans-serif;
      font-weight: 900;
      color: rgba(0, 255, 94, 0.035);
      transform: rotate(-18deg);
      z-index: 1;
      text-transform: uppercase;
      pointer-events: none;
    }

    .print-button {
      position: fixed;
      top: 12px;
      right: 12px;
      z-index: 99;
      padding: 10px 16px;
      background: #00ff5e;
      color: #000;
      border: 0;
      border-radius: 8px;
      font-weight: 900;
      cursor: pointer;
    }

    @media print {
      .print-button {
        display: none;
      }
    }
  </style>
</head>

<body>
  <button class="print-button" onclick="window.print()">Print / Save PDF</button>

  <section class="certificate">
    <div class="border-outer"></div>
    <div class="border-inner"></div>
    <div class="watermark">1st M.I.</div>

    <div class="content">
      <div class="unit">1st Mobile Infantry</div>
      <h1 class="title">Certificate of Merit</h1>
      <div class="subtitle">Merits & Awards Division</div>

      <div class="presented">This certificate is proudly awarded to</div>

      <div class="recipient">${recipient}</div>
      <div class="rank">${rank}</div>

      <div class="award">${award}</div>

      <div class="reason">${reason}</div>

      ${notes ? `<div class="notes">${notes}</div>` : ""}
    </div>

    <div class="footer">
      <div class="sig">
        Awarded by<br />
        <b>${presentedBy}</b>
      </div>

      <div class="sig">
        Date<br />
        <b>${date}</b>
      </div>
    </div>
  </section>
</body>
</html>
`;

  const certWindow = window.open("", "_blank", "width=1200,height=850");

  if (!certWindow) {
    alert("Certificate window was blocked. Allow popups for this app.");
    return;
  }

  certWindow.document.open();
  certWindow.document.write(certificateHtml);
  certWindow.document.close();
};

const getThemeAccent = () => {
  const appElement = document.querySelector(".app") as HTMLElement | null;

  const cssAccent = appElement
    ? getComputedStyle(appElement).getPropertyValue("--accent").trim()
    : "";

  return cssAccent || "#00ff5e";
};

const colourToRgba = (colour: string, alpha: number) => {
  const trimmed = colour.trim();

  if (trimmed.startsWith("#")) {
    const hex = trimmed.replace("#", "");
    const fullHex =
      hex.length === 3
        ? hex.split("").map((char) => char + char).join("")
        : hex;

    const r = parseInt(fullHex.slice(0, 2), 16);
    const g = parseInt(fullHex.slice(2, 4), 16);
    const b = parseInt(fullHex.slice(4, 6), 16);

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  if (trimmed.startsWith("rgb(")) {
    return trimmed.replace("rgb(", "rgba(").replace(")", `, ${alpha})`);
  }

  if (trimmed.startsWith("rgba(")) {
    return trimmed.replace(/rgba\(([^)]+)\)/, (_match, values) => {
      const parts = values.split(",").map((part: string) => part.trim());
      return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha})`;
    });
  }

  return `rgba(0, 255, 94, ${alpha})`;
};

const loadImageSafe = (src: string) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);

    image.src = src;
  });

const exportMeritCertificatePng = async (data: {
  recipient: string;
  rank: string;
  company: AwardCompany;
  award: string;
  reason: string;
  presentedBy: string;
  notes: string;
}) => {
  try {
    const accent = getThemeAccent();

    const width = 1400;
    const height = 2000;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      alert("Could not create certificate canvas.");
      return;
    }

    const recipient = data.recipient || "Trooper";
    const rank = data.rank || "";
    const award = data.award || "Merit / Award";
    const company = data.company || "Demon";
    const companyFooter = awardCompanyFooters[company] || awardCompanyFooters.Demon;
    const reason =
      data.reason ||
      "For outstanding service, dedication, and contribution to the 1st M.I.";
    const presentedBy = data.presentedBy || "Command";
    const notes = data.notes || "";
    const date = new Date().toLocaleDateString();

    const accentSoft = colourToRgba(accent, 0.22);
    const accentGlow = colourToRgba(accent, 0.75);
    const accentLight = colourToRgba(accent, 0.38);
    const accentFaint = colourToRgba(accent, 0.07);

    const getWrappedLines = (text: string, maxWidth: number) => {
      const words = text.split(/\s+/).filter(Boolean);
      const lines: string[] = [];
      let line = "";

      for (const word of words) {
        const testLine = line ? line + " " + word : word;

        if (ctx.measureText(testLine).width > maxWidth && line) {
          lines.push(line);
          line = word;
        } else {
          line = testLine;
        }
      }

      if (line) lines.push(line);

      return lines;
    };

    const drawAutoFitText = (
      text: string,
      x: number,
      y: number,
      maxWidth: number,
      maxHeight: number,
      maxFontSize: number,
      minFontSize: number,
      fontFamily: string,
      fontWeight = "",
      colour = "#ffffff"
    ) => {
      let fontSize = maxFontSize;
      let lines: string[] = [];
      let lineHeight = Math.round(fontSize * 1.35);

      while (fontSize >= minFontSize) {
        ctx.font = `${fontWeight ? fontWeight + " " : ""}${fontSize}px ${fontFamily}`;
        lineHeight = Math.round(fontSize * 1.35);
        lines = getWrappedLines(text, maxWidth);

        const totalHeight = lines.length * lineHeight;

        if (totalHeight <= maxHeight) {
          break;
        }

        fontSize -= 2;
      }

      const totalHeight = lines.length * lineHeight;
      let currentY = y + Math.max(0, (maxHeight - totalHeight) / 2) + fontSize;

      ctx.fillStyle = colour;
      ctx.textAlign = "center";

      for (const line of lines) {
        ctx.fillText(line, x, currentY);
        currentY += lineHeight;
      }
    };

    const drawLine = (
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      colour: string,
      widthValue = 2
    ) => {
      ctx.beginPath();
      ctx.strokeStyle = colour;
      ctx.lineWidth = widthValue;
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    };

    const drawStar = (x: number, y: number, radius: number, colour: string) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.beginPath();

      for (let i = 0; i < 10; i++) {
        const angle = (Math.PI / 5) * i - Math.PI / 2;
        const r = i % 2 === 0 ? radius : radius * 0.42;
        const px = Math.cos(angle) * r;
        const py = Math.sin(angle) * r;

        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }

      ctx.closePath();
      ctx.fillStyle = colour;
      ctx.fill();
      ctx.restore();
    };

    // Background
    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, "#020617");
    bg.addColorStop(0.5, "#000812");
    bg.addColorStop(1, "#000000");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    const glow = ctx.createRadialGradient(
      width / 2,
      height / 2,
      20,
      width / 2,
      height / 2,
      900
    );
    glow.addColorStop(0, accentSoft);
    glow.addColorStop(0.45, colourToRgba(accent, 0.08));
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");

    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    // Subtle grid
    ctx.strokeStyle = colourToRgba(accent, 0.055);
    ctx.lineWidth = 1;

    for (let x = 0; x <= width; x += 32) {
      drawLine(x, 0, x, height, colourToRgba(accent, 0.045), 1);
    }

    for (let y = 0; y <= height; y += 32) {
      drawLine(0, y, width, y, colourToRgba(accent, 0.045), 1);
    }

    // Watermark
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate((-18 * Math.PI) / 180);
    ctx.font = "900 190px Arial";
    ctx.fillStyle = accentFaint;
    ctx.textAlign = "center";
    ctx.fillText("1st M.I.", 0, 40);
    ctx.restore();

    // Outer glowing border
    ctx.shadowColor = accentGlow;
    ctx.shadowBlur = 24;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 8;
    ctx.strokeRect(60, 60, width - 120, height - 120);

    ctx.shadowBlur = 0;
    ctx.strokeStyle = accentLight;
    ctx.lineWidth = 2;
    ctx.strokeRect(105, 105, width - 210, height - 210);

    // Angled inner corners
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(135, 185);
    ctx.lineTo(185, 135);
    ctx.lineTo(width - 185, 135);
    ctx.lineTo(width - 135, 185);
    ctx.lineTo(width - 135, height - 185);
    ctx.lineTo(width - 185, height - 135);
    ctx.lineTo(185, height - 135);
    ctx.lineTo(135, height - 185);
    ctx.closePath();
    ctx.stroke();

    // Top emblem
    const logo = await loadImageSafe(certificateIconUrl);

    if (logo) {
      const logoSize = 150;

      ctx.shadowColor = accentGlow;
      ctx.shadowBlur = 20;

      ctx.drawImage(
        logo,
        width / 2 - logoSize / 2,
        110,
        logoSize,
        logoSize
      );

      ctx.shadowBlur = 0;
    }

    // Wing lines beside emblem
    ctx.strokeStyle = accentLight;
    ctx.lineWidth = 3;

    for (let i = 0; i < 3; i++) {
      const y = 165 + i * 22;
      drawLine(390, y, 540, y, accentLight, 3);
      drawLine(width - 540, y, width - 390, y, accentLight, 3);
    }

    // Header text
    ctx.textAlign = "center";
    ctx.shadowColor = accentGlow;
    ctx.shadowBlur = 18;
    ctx.fillStyle = accent;
    ctx.font = "900 68px Arial";
    ctx.fillText("1ST MOBILE INFANTRY", width / 2, 365);
    ctx.shadowBlur = 0;

    drawLine(320, 410, 620, 410, accent, 2);
    drawLine(780, 410, 1080, 410, accent, 2);
    drawStar(width / 2, 410, 16, accent);

    ctx.fillStyle = "#dbeafe";
    ctx.font = "700 32px Arial";
    ctx.fillText("MERITS & AWARDS DIVISION", width / 2, 465);

    // Presented text
    ctx.fillStyle = "#e5e7eb";
    ctx.font = "36px Georgia";
    ctx.fillText("This certificate is proudly presented to", width / 2, 555);

// Rank - shown above recipient name
drawAutoFitText(
  rank,
  width / 2,
  585,
  900,
  55,
  42,
  22,
  "Georgia",
  "",
  "#e5e7eb"
);

// Recipient
ctx.shadowColor = accentGlow;
ctx.shadowBlur = 18;
drawAutoFitText(
  recipient,
  width / 2,
  645,
  1050,
  100,
  86,
  32,
  "Georgia",
  "900",
  accent
);
ctx.shadowBlur = 0;

    drawLine(390, 800, 610, 800, accentLight, 2);
    drawLine(790, 800, 1010, 800, accentLight, 2);
    drawStar(width / 2, 800, 10, accent);

    // Award title
    ctx.shadowColor = accentGlow;
    ctx.shadowBlur = 15;
    drawAutoFitText(
      award,
      width / 2,
      815,
      1050,
      95,
      66,
      28,
      "Georgia",
      "900",
      accent
    );
    ctx.shadowBlur = 0;

    drawLine(420, 935, 610, 935, accent, 2);
    drawLine(790, 935, 980, 935, accent, 2);
    drawStar(650, 935, 9, accent);
    drawStar(width / 2, 935, 15, accent);
    drawStar(750, 935, 9, accent);

    // Reason/citation block
    drawAutoFitText(
      reason,
      width / 2,
      985,
      1050,
      notes.trim() ? 405 : 500,
      30,
      13,
      "Georgia",
      "",
      "#f8fafc"
    );

    // Notes
    if (notes.trim()) {
      drawAutoFitText(
        notes,
        width / 2,
        1400,
        1000,
        120,
        22,
        11,
        "Arial",
        "",
        "#cbd5e1"
      );
    }

    // Bottom seal
    const sealX = width / 2;
    const sealY = 1710;

    ctx.strokeStyle = accent;
    ctx.lineWidth = 4;
    ctx.shadowColor = accentGlow;
    ctx.shadowBlur = 15;

    ctx.beginPath();
    ctx.arc(sealX, sealY, 70, 0, Math.PI * 2);
    ctx.stroke();

    ctx.font = "900 54px Arial";
    ctx.fillStyle = accent;
    ctx.fillText("1", sealX, sealY + 18);

    ctx.font = "900 20px Arial";
    ctx.fillText("1ST M.I.", sealX, sealY - 28);

    ctx.shadowBlur = 0;

    // Signature and date
    drawLine(180, 1715, 520, 1715, accent, 2);
    drawLine(880, 1715, 1220, 1715, accent, 2);

    ctx.textAlign = "center";

    ctx.fillStyle = accent;
    ctx.font = "46px cursive";
    ctx.fillText(presentedBy, 350, 1695);

    ctx.font = "700 18px Arial";
    ctx.fillText("PRESENTED BY", 350, 1765);

    ctx.fillStyle = accent;
    ctx.font = "900 36px Arial";
    ctx.fillText(date, 1050, 1695);

    ctx.font = "700 18px Arial";
    ctx.fillText("DATE AWARDED", 1050, 1765);

    // Footer line
        drawAutoFitText(
          companyFooter,
          width / 2,
          1800,
          1050,
          50,
          24,
          12,
          "Arial",
          "700",
          "#e5e7eb"
        );

    canvas.toBlob((blob) => {
      if (!blob) {
        alert("Could not export certificate PNG.");
        return;
      }

      const fileName =
        safeName(`${recipient}-${award || "Merit-Certificate"}`) + ".png";

      const pngUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = pngUrl;
      link.download = fileName;

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(pngUrl);

      alert("Certificate PNG exported:\n" + fileName);
    }, "image/png");
  } catch (error) {
    console.error("Certificate PNG export failed:", error);
    alert("Certificate PNG export failed. Check DevTools console.");
  }
};

const awardCompanyOptions = ["Demon", "Nightmare", "Cerberus", "Hellfire"] as const;

type AwardCompany = typeof awardCompanyOptions[number];

const awardCompanyFooters: Record<AwardCompany, string> = {
  Demon: "DEMON COMPANY • THE ELITE FEW • BUILDING THE FUTURE",
  Nightmare: "NIGHTMARE COMPANY • GAS & ORE • WIN THE WAR",
  Cerberus: "CERBERUS COMPANY • THREE HEADS • ONE MISSION",
  Hellfire: "HELLFIRE COMPANY • FORGED IN FLAMES • DEFINED BY EXELLENCE"
};

const rankOptions = [
  "Private",
  "Private First Class",
  "Lance Corporal",
  "Specialist",
  "Corporal",
  "Sergeant",
  "Staff Sergeant",
  "Gunnery Sergeant",
  "Master Sergeant",
  "First Sergeant",
  "Master Gunnery Sergeant",
  "Officer Cadet",
  "Second Lieutenant",
  "First Lieutenant",
  "Captain",
  "Major",
  "Lieutenant Colonel",
  "Colonel"
];

function MeritsAwardsPanel() {
  const [recipient, setRecipient] = useState("");

  const awardFileInputRef = useRef<HTMLInputElement | null>(null);

  const [rank, setRank] = useState("");
  const [company, setCompany] = useState<AwardCompany>("Demon");
  const [award, setAward] = useState("");
  const [reason, setReason] = useState("");
  const [presentedBy, setPresentedBy] = useState("");
  const [notes, setNotes] = useState("");
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [multiProgress, setMultiProgress] = useState<Record<string, number[]>>({});
  const [awardSaveName, setAwardSaveName] = useState("");
  const [showAwardSaveNameModal, setShowAwardSaveNameModal] = useState(false);
  const [meritView, setMeritView] = useState<"calculator" | "awarded">("calculator");
  const [awardedMarks, setAwardedMarks] = useState<Record<string, boolean>>({});
  const [calculatorSearch, setCalculatorSearch] = useState("");
  const [awardedSearch, setAwardedSearch] = useState("");

  const getAwardValue = (item: MeritAward) => {
    if (item.inputs?.length) {
      return (multiProgress[item.name] || []).reduce((total, value) => total + Number(value || 0), 0);
    }

    return progress[item.name] || 0;
  };

  const earnedAwards = meritAwards.filter((item) => getAwardValue(item) >= item.target);
  const calculatorAwards = meritAwards.filter((item) => {
    const search = calculatorSearch.trim().toLowerCase();

    const searchableText = [
      item.name,
      item.description,
      item.unit
    ]
      .join(" ")
      .toLowerCase();

    return searchableText.includes(search) && !awardedMarks[item.name];
  });

const normaliseSearchText = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const searchMatchesAward = (item: MeritAward, searchValue: string) => {
  const search = normaliseSearchText(searchValue);

  if (!search) return true;

  const searchableText = normaliseSearchText(
    [
      item.name,
      item.description,
      item.unit,
      awardedMarks[item.name] ? "awarded" : "not awarded"
    ].join(" ")
  );

  // Exact phrase match first
  if (searchableText.includes(search)) {
    return true;
  }

  // Ignore tiny words like "at", "of", "to", "the"
  const searchWords = search
    .split(" ")
    .filter((word) => word.length >= 3);

  if (!searchWords.length) {
    return false;
  }

  // Every useful word must match
  return searchWords.every((word) => searchableText.includes(word));
};

const awardedRegisterAwards = awardRegisterItems.filter((item) =>
  searchMatchesAward(item, awardedSearch)
);

  const openAwardFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const loaded = JSON.parse(String(reader.result));

        if (loaded.saveType !== "merits-awards") {
          alert("This is not a Merits & Awards save file.");
          return;
        }

        setRecipient(loaded.recipient || "");
        setRank(loaded.rank || "");
        setCompany((loaded.company || "Demon") as AwardCompany);
        setAward(loaded.award || "");
        setReason(loaded.reason || "");
        setPresentedBy(loaded.presentedBy || "");
        setNotes(loaded.notes || "");
        setProgress(loaded.progress || {});
        setMultiProgress(loaded.multiProgress || {});
        setAwardSaveName(loaded.saveName || loaded.recipient || loaded.award || "");
        setAwardedMarks(loaded.awardedMarks || {});

        if (loaded.tacMap) {
          applyTacMapSnapshot(loaded.tacMap);
        }

        // Keep Merits & Awards editable after upload
        setGlobalSaveReadOnly(false);

        alert("Merits & Awards save loaded. Editing is enabled.");
      } catch (error) {
        alert("Could not open Merits & Awards file. Make sure it is a valid exported JSON file.");
        console.error(error);
      }
    };

    reader.readAsText(file);
    event.target.value = "";
  };

  const exportAward = (customName?: string) => {
    const finalName =
      customName?.trim() ||
      awardSaveName.trim() ||
      recipient.trim() ||
      award.trim() ||
      "Merits-Awards";

    exportJson(safeName(finalName) + ".json", {
      saveType: "merits-awards",
      saveName: finalName,
      recipient,
      rank,
      company,
      award,
      reason,
      presentedBy,
      notes,
      progress,
      multiProgress,
      awardedMarks,
      earnedAwards,
      createdAt: new Date().toISOString(),
      tacMap: getTacMapSnapshot()
    });
  };

  return (
    <div className="two-panel">
      <aside>
           <input
              ref={awardFileInputRef}
              type="file"
              accept=".json,application/json"
              style={{ display: "none" }}
              onChange={openAwardFile}
            />

        <div className="grid-two">
          <Button onClick={() => awardFileInputRef.current?.click()}>
            Open Award Save
          </Button>

          <Button onClick={() => exportAward()}>
            Save Award Save
          </Button>

          <Button onClick={() => setShowAwardSaveNameModal(true)}>
            Save As / Rename
          </Button>

          <Button
            onClick={() =>
              exportMeritCertificatePng({
                recipient,
                rank,
                company,
                award,
                reason,
                presentedBy,
                notes
              })
            }
          >
            Export Certificate PNG
          </Button>
        </div>

        <Card>
          <h3>Earned Awards</h3>

          <p>
            <b>Earned:</b> {earnedAwards.length}/{meritAwards.length}
            <br />
            <b>Awarded:</b>{" "}
            {Object.values(awardedMarks).filter(Boolean).length}/{meritAwards.length}
          </p>

          {earnedAwards.length ? (
            earnedAwards.map((item) => (
              <p key={item.name}>
                ✅ <b>{item.name}</b>
              </p>
            ))
          ) : (
            <p>No medals or rewards earned yet.</p>
          )}

          <div className="score-row">
            <Button
              active={meritView === "calculator"}
              onClick={() => setMeritView("calculator")}
            >
              Calculator
            </Button>

            <Button
              active={meritView === "awarded"}
              onClick={() => setMeritView("awarded")}
            >
              Awarded Register
            </Button>
          </div>
        </Card>
      </aside>

      <main>
        <Card>
          <h3>Award Details</h3>

          <div className="grid-two">
            <label>
              Recipient Name
              <input
                value={recipient}
                onChange={(event) => setRecipient(event.target.value)}
                placeholder="Trooper name..."
              />
            </label>

            <label>
              Rank
              <select
                value={rank}
                onChange={(event) => setRank(event.target.value)}
              >
                <option value="">Select rank</option>

                {rankOptions.map((rankName) => (
                  <option key={rankName} value={rankName}>
                    {rankName}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Company
              <select
                value={company}
                onChange={(event) => setCompany(event.target.value as AwardCompany)}
              >
                {awardCompanyOptions.map((companyName) => (
                  <option key={companyName} value={companyName}>
                    {companyName}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Award / Merit
              <input
                value={award}
                onChange={(event) => setAward(event.target.value)}
                placeholder="Award name..."
              />
            </label>

            <label>
              Awarded By
              <input
                value={presentedBy}
                onChange={(event) => setPresentedBy(event.target.value)}
                placeholder="Awarder..."
              />
            </label>
          </div>
        </Card>

       {meritView === "calculator" ? (
        <Card>
          <h3>Medal / Reward Calculator</h3>

          <input
            value={calculatorSearch}
            onChange={(event) => setCalculatorSearch(event.target.value)}
            placeholder="Search calculator awards..."
            className="award-search"
          />

          <div className="award-calculator">
            {calculatorAwards.length === 0 ? (
              <p>No calculator awards match your search, or all matching awards have been awarded.</p>
            ) : null}

            {calculatorAwards.map((item) => {
                const value = getAwardValue(item);
                const remaining = Math.max(0, item.target - value);
                const complete = value >= item.target;
                const percent = Math.min(100, Math.round((value / item.target) * 100));

                return (
                  <div key={item.name} className={"award-row " + (complete ? "earned" : "")}>
                    <div>
                      <h3>{complete ? "✅ " : ""}{item.name}</h3>
                      <p>{item.description}</p>
                      <small>
                        Target: {item.target.toLocaleString()} {item.unit}
                      </small>
                    </div>

                    <div>
                      {item.inputs?.length ? (
                        <div className="award-multi-inputs">
                          {item.inputs.map((label, index) => (
                            <label key={label}>
                              <small>{label}</small>

                              <input
                                type="number"
                                min={0}
                                value={(multiProgress[item.name] || [])[index] || 0}
                                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                  setMultiProgress((old) => {
                                    const nextValues = [...(old[item.name] || [])];
                                    nextValues[index] = Number(event.target.value);

                                    return {
                                      ...old,
                                      [item.name]: nextValues
                                    };
                                  })
                                }
                              />
                            </label>
                          ))}

                          <small>
                            Total: {value.toLocaleString()} / {item.target.toLocaleString()}
                          </small>
                        </div>
                      ) : (
                        <input
                          type="number"
                          min={0}
                          value={value}
                          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                            setProgress((old) => ({
                              ...old,
                              [item.name]: Number(event.target.value)
                            }))
                          }
                        />
                      )}

                      <div className="award-progress-bar">
                        <div
                          className="award-progress-fill"
                          style={{ width: percent + "%" }}
                        />
                      </div>

                      <small>
                        {complete
                          ? "Earned"
                          : remaining.toLocaleString() + " remaining"}
                      </small>
                    </div>
                  </div>
                );
              })}
          </div>
        </Card>
      ) : null}

  {meritView === "awarded" ? (
    <Card>
      <h3>Awarded Register</h3>
      <p>Tick awards here after they have been officially awarded.</p>

      <input
        value={awardedSearch}
        onChange={(event) => setAwardedSearch(event.target.value)}
        placeholder="Search awarded register..."
        className="award-search"
      />

      <div className="award-calculator">
        {awardedRegisterAwards.length === 0 ? (
          <p>No awarded register items match your search.</p>
        ) : null}

        {awardedRegisterAwards.map((item) => {
          const calculatedEarned = getAwardValue(item) >= item.target;
          const manuallyAwarded = Boolean(awardedMarks[item.name]);

          return (
            <div
              key={item.name}
              className={"award-row " + (manuallyAwarded ? "earned" : "")}
            >
              <div>
                <h3>{manuallyAwarded ? "🏅 " : ""}{item.name}</h3>
                <p>{item.description}</p>

                <small>
                  Calculator status: {calculatedEarned ? "Eligible / Earned" : "Not eligible yet"}
                </small>
              </div>

              <label className="row">
                <input
                  type="checkbox"
                  checked={manuallyAwarded}
                  onChange={(event) =>
                    setAwardedMarks((old) => ({
                      ...old,
                      [item.name]: event.target.checked
                    }))
                  }
                />

                Awarded
              </label>
            </div>
          );
        })}
      </div>
    </Card>
  ) : null}

        <Card>
          <h3>Reason for Award</h3>

          <TextBox
            value={reason}
            onChange={setReason}
            placeholder="Write the reason for the award..."
          />
        </Card>

        <Card>
          <h3>Additional Notes</h3>

          <TextBox
            value={notes}
            onChange={setNotes}
            placeholder="Optional notes..."
          />
        </Card>
      </main>

      {showAwardSaveNameModal ? (
        <div className="modal-backdrop">
          <div className="modal-box">
            <h2>Name Merits & Awards Save</h2>

            <input
              type="text"
              value={awardSaveName}
              onChange={(event) => setAwardSaveName(event.target.value)}
              placeholder="Enter save name..."
              className="save-name-input"
              autoFocus
            />

            <div className="modal-actions">
              <Button
                onClick={() => {
                  const trimmedName = awardSaveName.trim();

                  if (!trimmedName) {
                    alert("Please enter a save name.");
                    return;
                  }

                  exportAward(trimmedName);
                  setShowAwardSaveNameModal(false);
                }}
              >
                Save
              </Button>

              <Button onClick={() => setShowAwardSaveNameModal(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function App() {
  const COLOUR_SAVE_KEY = "ste-colour-id";
  const OVERLAY_SAVE_KEY = "ste-game-overlay-mode";

  const isOverlayWindow = window.location.hash.includes("/overlay");

  const [tab, setTab] = useState<Tab>("map");

  const [colourId, setColourId] = useState(() => {
    return localStorage.getItem(COLOUR_SAVE_KEY) || "hellfire orange";
  });

  const [resetKey, setResetKey] = useState(0);
  const [saveReadOnly, setSaveReadOnly] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [trainerName, setTrainerName] = useState(() => {
    return localStorage.getItem(TRAINER_NAME_SAVE_KEY) || "";
  });
  const [overlayMode, setOverlayMode] = useState(() => {
    return localStorage.getItem(OVERLAY_SAVE_KEY) === "true";
  });
  const saveTrainerName = (value: string) => {
    setTrainerName(value);
    localStorage.setItem(TRAINER_NAME_SAVE_KEY, value);

    window.dispatchEvent(
      new CustomEvent("ste-trainer-name-updated", {
        detail: value
      })
    );
  };

  useEffect(() => {
    localStorage.setItem(COLOUR_SAVE_KEY, colourId);
  }, [colourId]);

  useEffect(() => {
    const handleColourStorage = (event: StorageEvent) => {
      if (event.key === COLOUR_SAVE_KEY && event.newValue) {
        setColourId(event.newValue);
      }
    };

    window.addEventListener("storage", handleColourStorage);

    return () => {
      window.removeEventListener("storage", handleColourStorage);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(COLOUR_SAVE_KEY, colourId);
  }, [colourId]);

  useEffect(() => {
    localStorage.setItem(OVERLAY_SAVE_KEY, String(overlayMode));
  }, [overlayMode]);

  const toggleOverlayMode = async () => {
    const next = !overlayMode;

    setOverlayMode(next);
    localStorage.setItem(OVERLAY_SAVE_KEY, String(next));

    const overlayApi = (window as OverlayApiWindow).steOverlay;

    if (next) {
      setTab("map");
      await overlayApi?.open();
    } else {
      await overlayApi?.close();
    }
  };

  useEffect(() => {
    const handleOverlayKeybind = (event: KeyboardEvent) => {
      if (event.altKey && event.code === "Digit2") {
        event.preventDefault();
        void toggleOverlayMode();
      }
    };

    window.addEventListener("keydown", handleOverlayKeybind);

    return () => {
      window.removeEventListener("keydown", handleOverlayKeybind);
    };
  }, [overlayMode]);

  useEffect(() => {
    const handler = (event: Event) => {
      setSaveReadOnly(Boolean((event as CustomEvent<boolean>).detail));
    };

    window.addEventListener("ste-global-save-readonly", handler);

    return () => {
      window.removeEventListener("ste-global-save-readonly", handler);
    };
  }, []);

  const colour = colours.find((item) => item.id === colourId) || colours[0];

  const theme = {
    "--accent": colour.accent,
    "--soft": colour.soft,
    "--metallic": colour.metallic
  } as React.CSSProperties & Record<string, string>;

  const resetAndUnlock = () => {
    clearTacMapSnapshot();

    setResetKey((old) => old + 1);
    setSaveReadOnly(false);
    setGlobalSaveReadOnly(false);
    setTab("map");
  };

  const unlockEditing = () => {
    setSaveReadOnly(false);
    setGlobalSaveReadOnly(false);
  };

  const activePanel = (
    <>
      <div style={{ display: tab === "map" ? "block" : "none", height: "100%" }}>
        <TacMapPanel
          key={"map-" + resetKey}
          readOnly={saveReadOnly}
          overlayMode={isOverlayWindow}
        />
      </div>

      <div style={{ display: tab === "squad" ? "block" : "none", height: "100%" }}>
        <CertificatePanel
          key={"squad-" + resetKey}
          cert={squadCert}
          type="squad"
        />
      </div>

      <div style={{ display: tab === "pl" ? "block" : "none", height: "100%" }}>
        <CertificatePanel
          key={"pl-" + resetKey}
          cert={plCert}
          type="pl"
        />
      </div>

      <div style={{ display: tab === "builder" ? "block" : "none", height: "100%" }}>
        <BuilderPanel key={"builder-" + resetKey} />
      </div>

      <div style={{ display: tab === "spec" ? "block" : "none", height: "100%" }}>
        <SpecialisationPanel key={"spec-" + resetKey} />
      </div>

      <div style={{ display: tab === "merits" ? "block" : "none", height: "100%" }}>
        <MeritsAwardsPanel key={"merits-" + resetKey} />
      </div>
   </>
  );

  if (isOverlayWindow) {
    return (
      <div className="app game-overlay-shell" style={theme}>
        <style>{`
          .game-overlay-shell {
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0) !important;
            color: #f8fafc !important;
            overflow: hidden !important;
          }

          .no-map-background {
            position: absolute !important;
            inset: 0 !important;
            width: 100% !important;
            height: 100% !important;
            object-fit: contain !important;
            object-position: center !important;
            opacity: 0.85 !important;
            pointer-events: none !important;
            z-index: 0 !important;
          }

          .map-stage {
            position: relative !important;
            z-index: 1 !important;
            background: transparent !important;
          }

          .map-stage {
            width: 100%;
            height: 100%;
            min-height: 0 !important;
            display: flex;
            align-items: center;
            justify-content: center;
            background: transparent !important;
            position: relative !important;
            overflow: hidden;
          }

          .map-canvas {
            position: relative;
            width: 100%;
            height: 100%;
            min-height: 620px;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #000 !important;
          }

          .no-map-only {
            position: absolute;
            inset: 0;
            background: #000;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
          }

          .no-map-background {
            width: 100%;
            height: 100%;
            object-fit: contain;
            object-position: center;
            opacity: 1;
            pointer-events: none;
            display: block;
          }

          .map-stage {
            position: relative !important;
            width: "min(100%, 680px)",
            height: "min(100%, 680px)",
            aspect-ratio: 1 / 1;
            background: transparent !important;
            overflow: visible;
            z-index: 1;
            flex: 0 0 auto;
          }

          .map-image {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            object-fit: fill;
            pointer-events: none;
            z-index: 1;
          }

          .bughole-layer {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            object-fit: fill;
            pointer-events: none;
            z-index: 2;
          }

          .map-marker {
            position: absolute !important;
            width: 20px;
            height: 20px;
            transform: translate(-50%, -50%);
            border-radius: 999px;
            overflow: hidden;
            padding: 0;

            display: flex;
            align-items: center;
            justify-content: center;

            background: rgba(0, 0, 0, 0.9);
            border: 1px solid #f5a400;
            box-shadow: 0 0 4px rgba(0, 0, 0, 0.9);
            z-index: 20;
            cursor: pointer;
          }

          .map-marker img {
            width: 10px;
            height: 10px;
            object-fit: contain;
            pointer-events: none;
          }

          .bughole-layer {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            object-fit: contain;
            pointer-events: none;
            z-index: 2;
          }

          .map-marker {
            position: absolute;
            width: 20px;
            height: 20px;
            transform: translate(-50%, -50%);
            border-radius: 999px;
            overflow: hidden;
            padding: 0;

            display: flex;
            align-items: center;
            justify-content: center;

            background: rgba(0, 0, 0, 0.85);
            border: 1px solid #f5a400;
            box-shadow: 0 0 3px rgba(0, 0, 0, 0.9);
            z-index: 5;
            cursor: pointer;
          }

          .map-marker img {
            width: 10px;
            height: 10px;
            object-fit: contain;
            pointer-events: none;
          }

          .game-overlay-shell,
          .game-overlay-shell * {
            box-sizing: border-box;
          }

          .overlay-body {
            width: 100vw;
            height: 100vh;
            display: grid;
            grid-template-rows: 34px 1fr;
            overflow: hidden;
            background: transparent !important;
          }

          .overlay-tabs-bar {
            height: 34px;
            min-height: 34px;
            max-height: 34px;
            display: flex;
            align-items: center;
            gap: 5px;
            padding: 3px 6px;
            background: rgba(0, 0, 0, 0);
            border-bottom: 1px solid var(--accent);
            overflow-x: auto;
            overflow-y: hidden;
            white-space: nowrap;
            z-index: 10000;
          }

          .overlay-tabs-bar .btn {
            height: 26px !important;
            min-height: 26px !important;
            padding: 2px 8px !important;
            font-size: 11px !important;
            line-height: 1 !important;
            white-space: nowrap !important;
          }

          .overlay-content {
            min-height: 0;
            overflow: hidden;
            padding: 6px;
          }

          .game-overlay-shell .toolbar {
            min-height: 34px;
            padding: 4px 6px !important;
            gap: 5px !important;
            background: rgba(0, 0, 0, 0) !important;
            border: 1px solid rgba(0, 0, 0, 0) !important;
            border-radius: 10px;
            overflow-x: auto;
            overflow-y: hidden;
            white-space: nowrap;
          }

          .game-overlay-shell .toolbar .btn,
          .game-overlay-shell .toolbar select {
            height: 28px !important;
            min-height: 28px !important;
            padding: 3px 8px !important;
            font-size: 11px !important;
          }

          .game-overlay-shell .map-grid {
            height: calc(100vh - 84px);
            display: grid !important;
            grid-template-columns: 240px minmax(420px, 1fr) 270px !important;
            gap: 6px !important;
            margin-top: 6px !important;
            overflow: hidden !important;
          }

          .game-overlay-shell aside {
            max-height: calc(100vh - 92px) !important;
            overflow: auto !important;
            background: rgba(0, 0, 0, 0) !important;
            border: 1px solid rgba(0, 0, 0, 0) !important;
            border-radius: 12px !important;
          }

          .game-overlay-shell .card {
            background: rgba(0, 0, 0, 0) !important;
            border-color: rgba(0, 0, 0, 0) !important;
            box-shadow: none !important;
            color: #f8fafc !important;
          }

          .game-overlay-shell main {
            min-width: 0 !important;
            min-height: 0 !important;
            overflow: hidden !important;
          }

          .game-overlay-shell .map-canvas {
            height: calc(100vh - 132px) !important;
            max-height: calc(100vh - 132px) !important;
            min-height: 340px !important;
            background-color: transparent !important;
            border: 2px solid var(--accent) !important;
            border-radius: 14px !important;
            overflow: hidden !important;
            position: relative !important;
          }

          .game-overlay-shell .map-stage {
            width: 100% !important;
            height: 100% !important;
            min-height: 0 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            background: transparent !important;
            position: relative !important;
            overflow: hidden !important;
          }

          .game-overlay-shell .map-image {
            display: block !important;
            max-width: 100% !important;
            max-height: 100% !important;
            width: auto !important;
            height: auto !important;
            object-fit: contain !important;
            position: relative !important;
            z-index: 1 !important;
          }

          .game-overlay-shell .bughole-layer {
            position: absolute !important;
            inset: 0 !important;
            width: 100% !important;
            height: 100% !important;
            object-fit: contain !important;
            pointer-events: none !important;
            z-index: 2 !important;
          }

          .game-overlay-shell .map-marker {
            position: absolute !important;
            transform: translate(-50%, -50%) !important;
            z-index: 3 !important;
          }

          .game-overlay-shell .zoom-controls {
            position: absolute;
            left: 10px;
            bottom: 10px;
            z-index: 50;
            display: flex;
            gap: 4px;
          }

          .game-overlay-shell .zoom-controls .btn {
            height: 24px !important;
            min-height: 24px !important;
            padding: 2px 7px !important;
            font-size: 11px !important;
          }

          .game-overlay-shell input,
          .game-overlay-shell textarea,
          .game-overlay-shell select,
          .game-overlay-shell summary {
            background: rgb(0, 0, 0) !important;
            color: #ffffff !important;
            border-color: rgba(0, 0, 0, 0) !important;
          }

          .game-overlay-shell h1,
          .game-overlay-shell h2,
          .game-overlay-shell h3 {
            color: var(--accent) !important;
          }

          .overlay-help-button {
            position: fixed;
            left: 8px;
            bottom: 8px;
            z-index: 10000;
            height: 24px !important;
            min-height: 24px !important;
            padding: 2px 10px !important;
            font-size: 11px !important;
          }

          .overlay-credit {
            position: fixed;
            right: 8px;
            bottom: 6px;
            z-index: 9999;
            width: auto;
            max-width: 420px;
            max-height: 22px;
            overflow: hidden;
            font-size: 8px;
            line-height: 1.05;
            opacity: 0.55;
            text-align: right;
            pointer-events: none;
          }

          .help-panel {
            position: fixed;
            inset: 0;
            z-index: 10001;
            background: rgba(0, 0, 0, 0);
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .help-card {
            width: min(520px, calc(100vw - 32px));
            max-height: calc(100vh - 80px);
            overflow: auto;
            background: #111827 !important;
            border: 1px solid var(--accent) !important;
            border-radius: 14px;
            padding: 16px;
            color: white;
          }

          .help-title {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 8px;
          }

          .help-title h2 {
            margin: 0;
          }

          .help-close {
            width: 28px;
            height: 28px;
            min-height: 28px;
            padding: 0;
            border-radius: 8px;
            font-size: 22px;
            line-height: 1;
          }

          .map-canvas {
            position: relative !important;
            width: 100% !important;
            height: 100% !important;
            min-height: 620px !important;
            overflow: hidden !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            background: #000 !important;
          }

          .no-map-only {
            position: absolute !important;
            inset: 0 !important;
            background: #000 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            overflow: hidden !important;
            z-index: 0 !important;
          }

          .no-map-background {
            width: 100% !important;
            height: 100% !important;
            object-fit: contain !important;
            object-position: center !important;
            opacity: 1 !important;
            pointer-events: none !important;
            display: block !important;
            background: #000 !important;
          }

          .map-stage {
            position: relative !important;
            width: min(100%, 620px) !important;
            height: min(100%, 620px) !important;
            aspect-ratio: 1 / 1 !important;
            background: transparent !important;
            overflow: visible !important;
            z-index: 1 !important;
            flex: 0 0 auto !important;
            display: block !important;
          }

          .map-image {
            position: absolute !important;
            inset: 0 !important;
            width: 100% !important;
            height: 100% !important;
            max-width: none !important;
            max-height: none !important;
            object-fit: fill !important;
            pointer-events: none !important;
            z-index: 1 !important;
          }

          .bughole-layer {
            position: absolute !important;
            inset: 0 !important;
            width: 100% !important;
            height: 100% !important;
            object-fit: fill !important;
            pointer-events: none !important;
            z-index: 2 !important;
          }

          .map-marker {
            position: absolute !important;
            width: 14px !important;
            height: 14px !important;
            transform: translate(-50%, -50%) !important;
            border-radius: 999px !important;
            overflow: hidden !important;
            padding: 0 !important;

            display: flex !important;
            align-items: center !important;
            justify-content: center !important;

            background: rgba(0, 0, 0, 0.9) !important;
            border: 1px solid #f5a400 !important;
            box-shadow: 0 0 4px rgba(0, 0, 0, 0.9) !important;
            z-index: 20 !important;
            cursor: pointer !important;
          }

          .map-marker img {
            width: 10px !important;
            height: 10px !important;
            object-fit: contain !important;
            pointer-events: none !important;
          }
            .map-canvas {
              overscroll-behavior: contain !important;
              touch-action: none !important;
            }

            .map-stage,
            .map-image,
            .bughole-layer {
              user-select: none !important;
            }
            .no-active-map-stage {
              background: transparent !important;
              border: none !important;
              box-shadow: none !important;
              outline: none !important;
            }

            .no-active-map-stage::before,
            .no-active-map-stage::after {
              display: none !important;
              content: none !important;
            }

            .no-map-background {
              background: transparent !important;
              border: none !important;
              box-shadow: none !important;
               outline: none !important;
            }

            .game-overlay-shell .btn,
            .game-overlay-shell .tabs .btn,
            .game-overlay-shell .toolbar .btn,
            .game-overlay-shell .score-row .btn {
              background: var(--metallic) !important;
              color: #ffffff !important;
              border: 1px solid var(--accent) !important;
              box-shadow:
                inset 0 1px 0 rgba(255, 255, 255, 0.45),
                inset 0 -3px 7px rgba(0, 0, 0, 0.75),
                0 0 8px rgba(0, 0, 0, 0.65) !important;
              text-shadow: 0 1px 2px #000 !important;
            }

            .game-overlay-shell .btn.active {
              background: var(--metallic) !important;
              box-shadow:
                inset 0 2px 0 rgba(255, 255, 255, 0.65),
                inset 0 -4px 10px rgba(0, 0, 0, 0.9),
                0 0 30px var(--accent) !important;
            }

        `}</style>

        <section className="overlay-body">
          <header className="overlay-tabs-bar">
            {tabs.map((item) => (
              <Button
                key={item.id}
                active={tab === item.id}
                onClick={() => setTab(item.id)}
              >
                {item.label}
              </Button>
            ))}

            <Button onClick={resetAndUnlock}>
              New / Reset
            </Button>

            {saveReadOnly ? (
              <Button onClick={() => setGlobalSaveReadOnly(false)}>
                Unlock Edit
              </Button>
            ) : null}
          </header>

          <div className="overlay-content">
            {activePanel}
          </div>

          <button
            type="button"
            className="btn overlay-help-button"
            onClick={() => setShowHelp(true)}
          >
            Help
          </button>

          {showHelp ? (
            <div className="help-panel">
              <div className="help-card">
                <div className="help-title">
                  <h2>Help</h2>

                  <button
                    type="button"
                    className="btn help-close"
                    onClick={() => setShowHelp(false)}
                  >
                    ×
                  </button>
                </div>

                <p><b>Alt + 2:</b> Toggle overlay.</p>
                <p><b>Mouse wheel:</b> Zoom map.</p>
                <p><b>Click + drag:</b> Move map when zoomed in.</p>
                <p><b>Bug Holes:</b> Shows or hides the current map bughole overlay.</p>
                <p><b>Clear Level:</b> Clears markers on the current map level.</p>
              </div>
            </div>
          ) : null}

          <div className="overlay-credit">
        Made and coded by Matrix for the 1st M.I.<br />
        Tested by PurpleWolf, Cobber, Tina and Matrix<br />
        Contact Matrix, Tina or Purplewolf on Discord.<br />
        Discord.gg/1stMI
          </div>
        </section>
      </div>
    );
  }

  return (
  <div className="app" style={theme}>
    <style>{`
      .map-canvas {
        position: relative;
        overflow: hidden;
      }

      .map-stage {
        width: 100%;
        height: 100%;
        min-height: 0 !important;
        display: flex;
        align-items: center;
        justify-content: center;
        background: transparent !important;
      }

      .map-image {
        display: block;
        max-width: 100%;
        max-height: 100%;
        width: auto;
        height: auto;
        object-fit: contain;
        position: relative;
        z-index: 1;
      }

      .bughole-layer {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: contain;
        pointer-events: none;
        z-index: 2;
      }

      .map-marker {
        width: 22px;
        height: 22px;
        transform: translate(-50%, -50%);
        border-radius: 50%;
        overflow: hidden;

        display: flex;
        align-items: center;
        justify-content: center;

        background: rgba(0, 0, 0, 0.85);
        border: 2px solid #f5a400;
        box-shadow: 0 0 4px rgba(0, 0, 0, 0.8);
      }

      .map-marker img {
        width: 16px;
        height: 16px;
        object-fit: contain;
        pointer-events: none;
      }

      .no-map-selected {
        min-height: 720px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--accent);
        font-size: 28px;
        font-weight: 900;
        text-shadow: 0 0 12px black;
      }

      .brand img {
        width: 52px !important;
        height: 52px !important;
        object-fit: contain !important;
      }

      .no-map-background {
        position: absolute !important;
        inset: 0 !important;
        width: 100% !important;
        height: 100% !important;
        object-fit: contain !important;
        object-position: center !important;
        opacity: 0.85 !important;
        pointer-events: none !important;
        z-index: 0 !important;
      }

      .app {
        min-height: 100vh !important;
        height: 100vh !important;
        overflow: hidden !important;
      }

      .app-body {
        height: calc(100vh - 112px) !important;
        min-height: 0 !important;
        overflow: hidden !important;
      }

      .two-panel {
        height: 100% !important;
        max-height: 100% !important;
        min-height: 0 !important;
        overflow: hidden !important;
        display: grid !important;
        grid-template-columns: 320px 1fr !important;
        gap: 14px !important;
      }

      .two-panel > aside {
        min-height: 0 !important;
        max-height: 100% !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
        padding-right: 6px !important;
      }

      .two-panel > main {
        min-height: 0 !important;
        max-height: 100% !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
        padding-right: 6px !important;
      }

      .grid-two {
        min-height: 0 !important;
      }

      .map-stage {
        position: relative !important;
        z-index: 1 !important;
        background: transparent !important;
      }

      .help-button {
        position: fixed !important;
        left: 10px !important;
        bottom: 8px !important;
        z-index: 10000 !important;
        min-height: 24px !important;
        height: 24px !important;
        padding: 2px 10px !important;
        border-radius: 7px !important;
        font-size: 11px !important;
        font-weight: 700 !important;
        line-height: 1 !important;
      }

        .help-panel {
          position: fixed;
          inset: 0;
          z-index: 10001;
          background: rgba(0, 0, 0, 0);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .help-card {
          width: min(520px, calc(100vw - 32px));
          max-height: calc(100vh - 80px);
          overflow: auto;
          background: #111827;
          border: 1px solid var(--accent);
          border-radius: 14px;
          padding: 16px;
          color: white;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0);
        }

        .help-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 8px;
        }

        .help-title h2 {
          margin: 0;
        }

        .help-close {
          width: 28px;
          height: 28px;
          min-height: 28px;
          padding: 0;
          border-radius: 8px;
          font-size: 22px;
          line-height: 1;
        }

        .bottom-credit {
          position: fixed !important;
          right: 8px !important;
          left: auto !important;
          bottom: 32px !important;
          z-index: 9999 !important;
          width: auto !important;
          max-width: 420px !important;
          max-height: 30px !important;
          overflow: show !important;
          font-size: 12px !important;
          line-height: 1.05 !important;
          opacity: 1 !important;
          text-align: right !important;
          pointer-events: none !important;
          white-space: normal !important;
        }

        .app-header {
          min-height: 86px !important;
          height: auto !important;
          padding: 6px 10px !important;
          display: flex !important;
          align-items: center !important;
          gap: 10px !important;
          flex-wrap: wrap !important;
          overflow: visible !important;
        }

        .brand {
          display: flex !important;
          align-items: center !important;
          gap: 8px !important;
          flex: 0 0 auto !important;
        }

        .brand h1 {
          font-size: 16px !important;
          line-height: 1.1 !important;
          margin: 0 !important;
          white-space: nowrap !important;
        }

        .tabs {
          display: flex !important;
          align-items: center !important;
          gap: 4px !important;
          flex-wrap: wrap !important;
          overflow: visible !important;
          flex: 1 1 auto !important;
          min-width: 420px !important;
        }

        .tabs .btn {
          height: 32px !important;
          min-height: 32px !important;
          padding: 4px 10px !important;
          font-size: 12px !important;
          line-height: 1 !important;
          white-space: nowrap !important;
        }

        .btn,
        .tabs .btn,
        .header-actions .btn,
        .toolbar .btn,
        .score-row .btn {
          background: var(--metallic) !important;
          color: #ffffff !important;
          border: 1px solid var(--accent) !important;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.45),
            inset 0 -3px 7px rgba(0, 0, 0, 0.75),
            0 0 8px rgba(0, 0, 0, 0.65) !important;
          text-shadow: 0 1px 2px #000 !important;
        }

        .btn:hover,
        .tabs .btn:hover,
        .header-actions .btn:hover,
        .toolbar .btn:hover,
        .score-row .btn:hover {
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.6),
            inset 0 -3px 9px rgba(0, 0, 0, 0.85),
            0 0 10px var(--accent),
            0 0 24px var(--accent),
            0 0 38px var(--accent) !important;
        }

        .btn.active,
        .tabs .btn.active,
        .toolbar .btn.active,
        .score-row .btn.active {
          box-shadow:
            inset 0 2px 0 rgba(255, 255, 255, 0.65),
            inset 0 -4px 10px rgba(0, 0, 0, 0.9),
            0 0 12px var(--accent),
            0 0 30px var(--accent),
            0 0 48px var(--accent) !important;
        }

        select,
        input,
        textarea,
        summary {
          border: 1px solid var(--accent) !important;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.16),
            inset 0 -2px 6px rgba(0, 0, 0, 0.7) !important;
        }

        select {
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.14), rgba(0, 0, 0, 0.85)),
            #050505 !important;
          color: #ffffff !important;
        }

        .card {
          background:
            linear-gradient(145deg, rgba(255, 255, 255, 0.08), rgba(0, 0, 0, 0.55)),
            #202126 !important;
          border: 1px solid rgba(255, 255, 255, 0.14) !important;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.08),
            0 0 12px rgba(0, 0, 0, 0.75) !important;
        }

        .header-actions {
          display: flex !important;
          align-items: center !important;
          gap: 4px !important;
          flex-wrap: nowrap !important;
          flex: 0 0 auto !important;
        }

        .header-actions select,
        .header-actions .btn {
          height: 32px !important;
          min-height: 32px !important;
          font-size: 12px !important;
          white-space: nowrap !important;
        }

        .app {
          position: relative;
          min-height: 100vh;
          background: #000000;
          overflow: hidden;
        }
        .no-active-map-stage {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          outline: none !important;
        }

        .no-active-map-stage::before,
        .no-active-map-stage::after {
          display: none !important;
          content: none !important;
        }

        .no-map-background {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          outline: none !important;
        }

        .pass-text {
          color: #00ff5e !important;
        }

        .instant-fail-text {
          color: #ff0000 !important;
        }

        .needs-work-text {
          color: #ffd400 !important;
        }

        .award-calculator {
          display: grid;
          gap: 10px;
        }

        .award-row {
          display: grid;
          grid-template-columns: 1fr 220px;
          gap: 12px;
          align-items: center;
          padding: 12px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 12px;
          background: rgba(2, 6, 23, 0.55);
        }

        .award-row.earned {
          border-color: var(--accent);
          box-shadow: 0 0 12px rgba(255, 255, 255, 0.12);
        }

        .award-row h3 {
          margin: 0 0 4px 0;
        }

        .award-row p {
          margin: 0 0 4px 0;
        }

        .award-progress-bar {
          width: 100%;
          height: 10px;
          margin-top: 8px;
          margin-bottom: 6px;
          border-radius: 999px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.14);
        }

        .award-progress-fill {
          height: 100%;
          background: var(--accent);
        }

        .award-multi-inputs {
          display: grid;
          gap: 6px;
        }

        .award-multi-inputs label {
          display: grid;
          gap: 2px;
        }

        .award-multi-inputs input {
          width: 100%;
        }

        .award-search {
          width: 100%;
          margin-bottom: 10px;
        }
          .settings-save-folder {
            margin-top: 14px;
            padding-top: 12px;
            border-top: 1px solid rgba(255, 255, 255, 0.15);
          }

          .settings-save-folder h3 {
            margin: 0 0 6px 0;
          }

          .settings-save-folder p {
            margin: 0 0 10px 0;
            opacity: 0.8;
          }

          .modifier-search-input {
            width: 100%;
            margin-bottom: 8px;
            padding: 8px 10px;
            border-radius: 8px;
            border: 1px solid var(--accent);
            background: rgba(0, 0, 0, 0.75);
            color: white;
          }

          .no-search-results {
            margin: 8px 0;
            opacity: 0.75;
            font-size: 12px;
          }

      `}</style>

      <header className="app-header">
        <div className="brand">
          <img src={iconUrl} alt="1st M.I. Tactical Centre" />

          <div>
            <h1>1st M.I. Tactical Centre</h1>
            <p>Maps, operations, and certifications</p>
          </div>
        </div>

        <nav className="tabs">
          {tabs.map((item) => (
            <Button
              key={item.id}
              active={tab === item.id}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </Button>
          ))}
        </nav>

        <div className="header-actions">
          <Button onClick={() => setShowSettings(true)}>
            Settings
          </Button>

          <Button onClick={resetAndUnlock}>
            New / Reset
          </Button>

          {saveReadOnly ? (
            <Button onClick={unlockEditing}>
              Unlock Editing
            </Button>
          ) : null}
        </div>
      </header>

      <section className="app-body">
        {activePanel}
      </section>

      <button
        type="button"
        className="help-button"
        onClick={() => setShowHelp(true)}
      >
        Help
      </button>

        {showSettings ? (
          <div className="help-panel">
            <div className="help-card">
              <div className="help-title">
                <h2>Settings</h2>

                <button
                  type="button"
                  className="help-close"
                  onClick={() => setShowSettings(false)}
                >
                  ×
                </button>
              </div>

              <label>
                Colour Scheme
                <select
                  value={colourId}
                  onChange={(event) => setColourId(event.target.value)}
                >
                  {colours.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Trainer Name
                <input
                  value={trainerName}
                  placeholder="Enter trainer name..."
                  onChange={(event) => saveTrainerName(event.target.value)}
                />
              </label>

              <div className="settings-save-folder">
                <h3>Save Folder</h3>

                <p>
                  Select where operation, certification, and merits saves are exported.
                </p>

                <Button onClick={() => getSaveFolder()}>
                  Change Save Folder Location
                </Button>
              </div>
            </div>
          </div>
        ) : null}

      {showHelp ? (
        <div className="help-panel">
          <div className="help-card">
            <div className="help-title">
              <h2>Help</h2>

              <button
                type="button"
                className="help-close"
                onClick={() => setShowHelp(false)}
              >
                ×
              </button>
            </div>

            <p><b>Alt + 2:</b> Toggle overlay.</p>
            <p><b>Mouse wheel:</b> Zoom map.</p>
            <p><b>Click + drag:</b> Move map when zoomed in.</p>
            <p><b>Reset View:</b> Resets zoom and map position.</p>
            <p><b>Clear Level:</b> Clears markers on the current map level.</p>
            <p><b>Reset Tac Map:</b> Clears the full Tac Map tab.</p>
            <p><b>Open Save:</b> Opens a saved operation file.</p>
            <p><b>Export Save:</b> Saves the current operation.</p>
            <p><b>Change Save Folder:</b> Selects where exported saves are written.</p>
          </div>
        </div>
      ) : null}

      <div className="bottom-credit">
        Made and coded by Matrix for the 1st M.I.<br />
        Tested by PurpleWolf, Cobber, Tina and Matrix<br />
        Contact Matrix, Tina or Purplewolf on Discord.<br />
        Discord.gg/1stMI
      </div>
    </div>
  );
}