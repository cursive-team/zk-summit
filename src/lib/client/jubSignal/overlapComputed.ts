import { object, string } from "yup";
import { JUB_SIGNAL_MESSAGE_TYPE, encryptMessage } from ".";

export type OverlapComputedMessage = {
  overlapIndices: string;
  userId: string;
};

export const overlapComputedMessageSchema = object({
  overlapIndices: string().required(),
  userId: string().required(),
});

export async function encryptOverlapComputedMessage(
  overlapIndicesArray: number[],
  userId: string,
  senderPrivateKey: string,
  senderPublicKey: string
): Promise<string> {
  const messageData: OverlapComputedMessage = {
    overlapIndices: JSON.stringify(overlapIndicesArray),
    userId,
  };

  return await encryptMessage(
    JUB_SIGNAL_MESSAGE_TYPE.OVERLAP_COMPUTED,
    messageData,
    senderPrivateKey,
    senderPublicKey
  );
}
