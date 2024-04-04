export type KeygenData = {
  box: "brown" | "one" | "two"; // Box the card is located in
  type: "person" | "talk"; // Person or talk card
  precreateUser?: boolean; // Should we precreate the user?
  speaker?: boolean; // Is this a speaker?
  talkName?: string; // Name of the talk
  talkDescription?: string; // Description of the talk
};

export const initialKeygenData: Record<string, KeygenData> = {
  "1240734213937552": {
    box: "brown",
    type: "person",
    precreateUser: true,
    speaker: true,
  },
  "1231517214120336": {
    box: "brown",
    type: "person",
    precreateUser: false,
    speaker: false,
  },
  "1227316736104848": {
    box: "brown",
    type: "talk",
    talkName: "ZK Proofs 101",
    talkDescription: "An introduction to zero-knowledge proofs",
  },
};
