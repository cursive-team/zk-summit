import { sha256 } from "js-sha256";
import { getLocationSignatures, getProfile, getUsers } from "./localStorage";

// need to call `useScripts` before this will work
export function createFlower(
  stage: any,
  pubKey: string,
  x: number,
  y: number,
  size: number
) {
  const flower = new Array();
  for (var j = 0; j < 15; j++) {
    let color = parseInt(sha256(pubKey + j.toString() + "1"), 16) % 254;
    const color_16_1 = color.toString(16);
    color = parseInt(sha256(pubKey + j.toString() + "2"), 16) % 254;
    const color_16_2 = color.toString(16);
    color = parseInt(sha256(pubKey + j.toString() + "3"), 16) % 254;
    const color_16_3 = color.toString(16);
    const color_str = "#" + color_16_1 + color_16_2 + color_16_3;
    flower[j] = new window.Flower();
    flower[j]
      .init()
      .setColor(color_str)
      .setPetal((parseInt(sha256(pubKey + j.toString() + "4"), 16) % 6) + 6)
      .setPile(1, 1.0)
      .setAlpha(0.5)
      .setSize(size)
      .setPetalSize(size + 5)
      .setRotation(parseInt(sha256(pubKey + j.toString() + "5"), 16) % 360)
      .create(x, y);
    stage.addChild(flower[j].flower);
    size = size - size / 10;
  }
  stage.update();
}

export type PubKeyArrayElement = {
  pubKey: string;
  timestamp: number;
  name: string;
  person: boolean;
};

export function getArtSignatures() {
  const profile = getProfile();
  const combined: PubKeyArrayElement[] = [];

  const users = getUsers();
  for (const userKey in users) {
    const user = users[userKey];
    if (user.sigPk === profile?.signaturePublicKey) continue;
    const ts = user.inTs;
    const pk = user.sigPk;
    if (ts && pk) {
      combined.push({
        pubKey: pk,
        timestamp: new Date(ts).getTime(),
        name: user.name,
        person: true,
      });
    }
  }

  const locationSignatures = getLocationSignatures();
  for (const locationKey in locationSignatures) {
    const location = locationSignatures[locationKey];
    const ts = new Date(location.ts).getTime();
    const pk = location.pk;
    if (ts && pk) {
      combined.push({
        pubKey: pk,
        timestamp: ts,
        name: location.name,
        person: false,
      });
    }
  }

  combined.sort((a, b) => a.timestamp - b.timestamp);
  // add personal signature to the beginning of the array
  combined.unshift({
    pubKey: profile?.signaturePublicKey ?? "0",
    timestamp: new Date().getTime(),
    name: "You",
    person: true,
  });

  return combined;
}

export const generateSpiralPattern = (n: number): number[][] => {
  const result: number[][] = [];
  const directions = [
    [1, 0],
    [0, 1],
    [-1, 0],
    [0, -1],
  ];
  let currentDirectionIndex = 0;
  let stepsInCurrentDirection = 0;
  let stepCount = 0;
  let x = -0.5,
    y = -0.5;
  let currentSide = 1;

  for (let i = 0; i < n; i++) {
    result.push([x, y]);
    if (stepsInCurrentDirection === currentSide) {
      currentDirectionIndex = (currentDirectionIndex + 1) % directions.length;
      stepsInCurrentDirection = 0;
    }

    x += directions[currentDirectionIndex][0];
    y += directions[currentDirectionIndex][1];

    stepsInCurrentDirection++;
    stepCount++;

    if (stepCount === currentSide * 4) {
      currentSide += 1;
      x = -0.5 * currentSide;
      y = -0.5 * currentSide;
      stepCount = 0;
      stepsInCurrentDirection = 0;
      currentDirectionIndex = 0;
    }
  }

  return result;
};

export const makeGarden = (
  stage: any,
  signatures: PubKeyArrayElement[],
  spiral: number[][],
  size: number,
  rangeValue: number
) => {
  const center_x = stage.canvas.width / 2;
  const center_y = stage.canvas.height / 2;

  // put your own flower in the center
  if (signatures.length === 1) {
    createFlower(stage, signatures[0].pubKey, center_x, center_y, size / 4);
  } else {
    createFlower(stage, signatures[0].pubKey, center_x, center_y, size / 8);
  }

  for (let i = 1; i < rangeValue; i++) {
    const flowerSize = size / 16;
    const x = center_x + (stage.canvas.width / 4) * spiral[i - 1][0];
    const y = center_y + (stage.canvas.width / 4) * spiral[i - 1][1];
    createFlower(stage, signatures[i].pubKey, x, y, flowerSize);
  }
};
