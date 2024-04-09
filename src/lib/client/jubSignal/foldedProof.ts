import { object, string } from "yup";
import { JUB_SIGNAL_MESSAGE_TYPE, encryptMessage } from ".";

export type FoldedProofMessage = {
  pfId: string; // Id of folding proof
  pfLink: string; // Link to folding proof
};

export const foldedProofMessageSchema = object({
  pfId: string().required(),
  pfLink: string().required(),
});

export type EncryptFoldedProofMessageArgs = {
  proofId: string;
  proofLink: string;
  senderPrivateKey: string;
  recipientPublicKey: string;
};

export async function encryptFoldedProofMessage({
  proofId,
  proofLink,
  senderPrivateKey,
  recipientPublicKey,
}: EncryptFoldedProofMessageArgs): Promise<string> {
  const messageData: FoldedProofMessage = {
    pfId: proofId,
    pfLink: proofLink,
  };

  const encryptedMessage = await encryptMessage(
    JUB_SIGNAL_MESSAGE_TYPE.FOLDED_PROOF,
    messageData,
    senderPrivateKey,
    recipientPublicKey
  );

  return encryptedMessage;
}
