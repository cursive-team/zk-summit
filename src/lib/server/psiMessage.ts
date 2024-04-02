import prisma from "@/lib/server/prisma";
import {
  JUB_SIGNAL_MESSAGE_TYPE,
  PsiMessageResponse,
} from "../client/jubSignal";

export async function findAndDeleteMostRecentPsiMessage(
  recipientEncKey: string
): Promise<PsiMessageResponse | undefined> {
  // Find the earliest message for the given userId
  const message = await prisma.psiMessage.findFirst({
    where: { recipientEncKey: recipientEncKey },
    orderBy: { createdAt: "asc" },
  });

  // If a message is found, delete it
  if (message) {
    try {
      await prisma.psiMessage.delete({ where: { id: message.id } });
    } catch (e) {
      console.error("Error deleting most recent psi message", e);
    }
  } else {
    return undefined;
  }

  return {
    data: message.data,
    senderEncKey: message.senderEncKey,
  };
}
