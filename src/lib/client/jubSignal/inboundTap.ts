import { object, string } from "yup";
import { JUB_SIGNAL_MESSAGE_TYPE, encryptMessage } from ".";

export type InboundTapMessage = {
  x?: string; // Twitter handle
  tg?: string; // Telegram handle
  fc?: string; // Farcaster handle
  bio?: string; // Bio
  pk: string; // Signature public key
  pkId: string; // Public key ID
  msg: string; // Signature message
  sig: string; // Signature
};

export const inboundTapMessageSchema = object({
  x: string().optional(),
  tg: string().optional(),
  fc: string().optional(),
  bio: string().optional(),
  pk: string().required(),
  pkId: string().required(),
  msg: string().required(),
  sig: string().required(),
});

export type EncryptInboundTapMessageArgs = {
  twitterUsername?: string;
  telegramUsername?: string;
  farcasterUsername?: string;
  bio?: string;
  signaturePublicKey: string;
  pkId: string;
  signatureMessage: string;
  signature: string;
  senderPrivateKey: string;
  recipientPublicKey: string;
};

export async function encryptInboundTapMessage({
  twitterUsername,
  telegramUsername,
  farcasterUsername,
  bio,
  signaturePublicKey,
  signatureMessage,
  signature,
  senderPrivateKey,
  recipientPublicKey,
  pkId,
}: EncryptInboundTapMessageArgs): Promise<string> {
  const messageData: InboundTapMessage = {
    x: twitterUsername,
    tg: telegramUsername,
    fc: farcasterUsername,
    bio,
    pk: signaturePublicKey,
    msg: signatureMessage,
    sig: signature,
    pkId,
  };

  const encryptedMessage = await encryptMessage(
    JUB_SIGNAL_MESSAGE_TYPE.INBOUND_TAP,
    messageData,
    senderPrivateKey,
    recipientPublicKey
  );

  return encryptedMessage;
}
