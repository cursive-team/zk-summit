import { object, string } from "yup";
import { JUB_SIGNAL_MESSAGE_TYPE, encryptMessage } from ".";

export type OutboundTapMessage = {
  name: string; // Display name of other user
  pk: string; // Encryption public key of user
  pkId: string; // Public key ID
  note?: string; // Private note
};

export const outboundTapMessageSchema = object({
  name: string().required(),
  pk: string().required(),
  pkId: string().required(),
  note: string().optional(),
});

export type EncryptOutboundTapMessageArgs = {
  displayName: string;
  pkId: string;
  encryptionPublicKey: string;
  privateNote?: string;
  senderPrivateKey: string;
  recipientPublicKey: string;
};

export async function encryptOutboundTapMessage({
  displayName,
  pkId,
  encryptionPublicKey,
  privateNote,
  senderPrivateKey,
  recipientPublicKey,
}: EncryptOutboundTapMessageArgs): Promise<string> {
  const messageData: OutboundTapMessage = {
    name: displayName,
    pk: encryptionPublicKey,
    note: privateNote,
    pkId: pkId,
  };

  const encryptedMessage = await encryptMessage(
    JUB_SIGNAL_MESSAGE_TYPE.OUTBOUND_TAP,
    messageData,
    senderPrivateKey,
    recipientPublicKey
  );

  return encryptedMessage;
}
