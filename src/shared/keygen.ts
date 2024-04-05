export type KeygenData = {
  box: "brown" | "one" | "two"; // Box the card is located in
  type: "person" | "talk"; // Person or talk card
  label?: string; // Label for the card, used for testing
  speaker?: boolean; // Is this a speaker?
  talkName?: string; // Name of the talk
  talkDescription?: string; // Description of the talk
};

export const initialKeygenData: Record<string, KeygenData> = {
  "1240734213937552": {
    box: "brown",
    type: "person",
    label: "andrew 1",
    speaker: false,
  },
  "1231517214120336": {
    box: "brown",
    type: "person",
    label: "andrew 2 (speaker)",
    speaker: true,
  },
  "1227316736104848": {
    box: "brown",
    type: "person",
    label: "andrew 3",
    speaker: false,
  },
  "1194473121192336": {
    box: "brown",
    type: "person",
    label: "vivek 1",
    speaker: false,
  },
  "1249530306959760": {
    box: "brown",
    type: "person",
    label: "vivek 2 (speaker)",
    speaker: true,
  },
  "1276094679685520": {
    box: "brown",
    type: "person",
    label: "vivek 3",
    speaker: false,
  },
  "1219628744645008": {
    box: "brown",
    type: "person",
    label: "kali",
    speaker: false,
  },
  "1288696113731984": {
    box: "brown",
    type: "person",
    label: "rachel",
    speaker: false,
  },
  "1267161147709840": {
    box: "brown",
    type: "person",
    label: "jack",
    speaker: false,
  },
  "1215309081287056": {
    box: "brown",
    type: "person",
    label: "ian",
    speaker: false,
  },
  "1235069152074128": {
    box: "brown",
    type: "person",
    label: "unregistered user",
    speaker: false,
  },
  "1324009334839696": {
    box: "brown",
    type: "talk",
    label: "talk 1",
    talkName: "Zero knowledge proofs 101",
    talkDescription: "An introduction to zero knowledge proofs",
  },
  "1269398825671056": {
    box: "brown",
    type: "talk",
    label: "talk 2",
    talkName: "Superhyperultrameganova",
    talkDescription: "The newest folding scheme",
  },
  "1294288161151376": {
    box: "brown",
    type: "talk",
    label: "talk 3",
    talkName: "Decentralized prover networks",
    talkDescription: "Where's my token?",
  },
};
