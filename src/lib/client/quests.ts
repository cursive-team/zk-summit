import { LocationRequirement, UserRequirement } from "@/types";
import { getProfile } from "./localStorage";

export const computeNumRequirementsSatisfied = (args: {
  userPublicKeys: string[]; // List of signature public keys for users who have sent signatures
  locationPublicKeys: string[]; // List of signature public keys for visited locations
  userOutboundTaps: number; // count of outbound taps for any
  userRequirements: UserRequirement[];
  locationRequirements: LocationRequirement[];
  questUserTapReq: number | null;
}): number => {
  const {
    userPublicKeys,
    locationPublicKeys,
    userOutboundTaps,
    userRequirements,
    locationRequirements,
    questUserTapReq,
  } = args;

  if (userRequirements.length === 0) {
    return computeNumRequirementSignatures({
      publicKeyList: locationPublicKeys,
      locationRequirement: locationRequirements[0],
    });
  } else {
    return computeNumRequirementSignatures({
      publicKeyList: userPublicKeys,
      userRequirement: userRequirements[0],
    });
  }
};

// Given a list of public keys corresponding to signatures and a user or location requirement,
// return the number of signatures that satisfy the requirement
// Will return the minimum of the number of signatures possessed by the user and the number of
// signatures required by the requirement
export const computeNumRequirementSignatures = (args: {
  publicKeyList: string[];
  userRequirement?: UserRequirement;
  locationRequirement?: LocationRequirement;
}): number => {
  const { publicKeyList, userRequirement, locationRequirement } = args;

  if (userRequirement && locationRequirement) {
    throw new Error(
      "Cannot provide both a user and location requirement to computeNumRequirementSignatures"
    );
  }

  const profile = getProfile();

  if (!profile) {
    throw new Error("User profile not found in local storage");
  }

  if (userRequirement) {
    return Math.min(
      userRequirement.numSigsRequired,
      userRequirement.users.filter(
        (user) =>
          publicKeyList.includes(user.signaturePublicKey) &&
          user.signaturePublicKey !== profile.signaturePublicKey
      ).length
    );
  } else if (locationRequirement) {
    return Math.min(
      locationRequirement.numSigsRequired,
      locationRequirement.locations.filter((location) =>
        publicKeyList.includes(location.signaturePublicKey)
      ).length
    );
  } else {
    throw new Error(
      "Must provide either a user or location requirement to computeNumRequirementSignatures"
    );
  }
};
