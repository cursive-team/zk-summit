import { MembershipFolder } from "@/lib/client/nova";

onmessage = async (event) => {
    const { compressedParams, iteration, proof, type, user } = event.data

    const membershipFolder = await MembershipFolder.initWithIndexDB(compressedParams);

    // If no proof is provided then start initial fold
    if (!proof) {
        const initialProof = await membershipFolder.startFold(user);
        postMessage({ iteration, proof: initialProof, type });
    } else {
        const continuedProof = await membershipFolder.continueFold(
            user,
            proof,
            1
        );
        postMessage({ proof: continuedProof, iteration })
    }
}