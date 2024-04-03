import { MessageRequest } from "@/pages/api/messages";
import {
  JUB_SIGNAL_MESSAGE_TYPE,
  PlaintextMessage,
  decryptMessage,
  encryptedMessageSchema,
  inboundTapMessageSchema,
  itemRedeemedMessageSchema,
  locationTapMessageSchema,
  outboundTapMessageSchema,
  questCompletedMessageSchema,
} from "./jubSignal";
import {
  Activity,
  ItemRedeemed,
  LocationSignature,
  QuestCompleted,
  User,
  getActivities,
  getAllItemRedeemed,
  getAllQuestCompleted,
  getKeys,
  getLocationSignatures,
  getProfile,
  getSession,
  getUsers,
  saveActivities,
  saveAllItemRedeemed,
  saveAllQuestCompleted,
  saveLocationSignatures,
  saveSession,
  saveUsers,
} from "./localStorage";
import { hashPublicKeyToUUID } from "./utils";
import { registeredMessageSchema } from "./jubSignal/registered";

export type LoadMessagesRequest = {
  forceRefresh: boolean;
  messageRequests?: MessageRequest[];
};
// Loads messages from the server and updates the local storage
// Optionally sends a new message before fetching messages
// Uses the lastMessageFetchTimestamp from the session to determine the start date for the fetch
// If forceRefresh is true, fetches all messages from the server
export const loadMessages = async ({
  forceRefresh,
  messageRequests,
}: LoadMessagesRequest): Promise<void> => {
  const session = getSession();
  if (!session || session.authToken.expiresAt < new Date()) {
    console.error("Invalid session while trying to load messages");
    throw new Error("Invalid session while trying to load messages");
  }

  const profile = getProfile();
  const keys = getKeys();
  if (!profile || !keys) {
    console.error("Error loading profile and keys from local storage");
    throw new Error("Error loading profile and keys from local storage");
  }

  // Fetch jubSignal messages from server
  // Send a new message if requested
  const previousMessageFetchTime = session.lastMessageFetchTimestamp;
  let response;
  if (messageRequests) {
    response = await fetch("/api/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: session.authToken.value,
        messageRequests,
        shouldFetchMessages: true,
        startDate: previousMessageFetchTime
          ? previousMessageFetchTime.toISOString()
          : undefined,
      }),
    });
  } else {
    const urlStartFilter =
      previousMessageFetchTime && !forceRefresh
        ? `&startDate=${encodeURIComponent(
            previousMessageFetchTime.toISOString()
          )}`
        : "";
    const url =
      `/api/messages?token=${encodeURIComponent(session.authToken.value)}` +
      urlStartFilter;
    response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  if (!response.ok) {
    console.error("Error fetching jubSignal messages from server");
    throw new Error("Error fetching jubSignal messages from server");
  }

  // Decrypt messages and update localStorage with decrypted messages
  // Start with empty users, location signatures, quest completed, activities if forceRefresh is true
  const { messages, mostRecentMessageTimestamp } = await response.json();
  if (
    !Array.isArray(messages) ||
    typeof mostRecentMessageTimestamp !== "string" ||
    isNaN(Date.parse(mostRecentMessageTimestamp))
  ) {
    console.error("Invalid messages received from server");
    throw new Error("Invalid messages received from server");
  }
  const existingUsers = forceRefresh ? {} : getUsers();
  const existingLocationSignatures = forceRefresh
    ? {}
    : getLocationSignatures();
  const existingQuestCompleted = forceRefresh ? {} : getAllQuestCompleted();
  const existingItemRedeemed = forceRefresh ? {} : getAllItemRedeemed();
  const existingActivities = forceRefresh ? [] : getActivities();
  const {
    newUsers,
    newLocationSignatures,
    newQuestCompleted,
    newItemRedeemed,
    newActivities,
  } = await processEncryptedMessages({
    messages,
    recipientPrivateKey: keys.encryptionPrivateKey,
    recipientPublicKey: profile.encryptionPublicKey,
    existingUsers,
    existingLocationSignatures,
    existingQuestCompleted,
    existingItemRedeemed,
    existingActivities,
  });

  // Save users, location signatures, activities to localStorage
  saveUsers(newUsers);
  saveLocationSignatures(newLocationSignatures);
  saveAllQuestCompleted(newQuestCompleted);
  saveAllItemRedeemed(newItemRedeemed);
  saveActivities(newActivities);

  // Update the session
  session.lastMessageFetchTimestamp = new Date(mostRecentMessageTimestamp);
  saveSession(session);
};

// Helper function to process encrypted messages and update users, location signatures, activities
const processEncryptedMessages = async (args: {
  messages: any[];
  recipientPrivateKey: string;
  recipientPublicKey: string;
  existingUsers: Record<string, User>;
  existingLocationSignatures: Record<string, LocationSignature>;
  existingQuestCompleted: Record<string, QuestCompleted>;
  existingItemRedeemed: Record<string, ItemRedeemed>;
  existingActivities: Activity[];
}): Promise<{
  newUsers: Record<string, User>;
  newLocationSignatures: Record<string, LocationSignature>;
  newQuestCompleted: Record<string, QuestCompleted>;
  newItemRedeemed: Record<string, ItemRedeemed>;
  newActivities: Activity[];
}> => {
  const {
    messages,
    recipientPrivateKey,
    recipientPublicKey,
    existingUsers: users,
    existingLocationSignatures: locationSignatures,
    existingQuestCompleted: questCompleted,
    existingItemRedeemed: itemRedeemed,
    existingActivities: activities,
  } = args;

  activities.reverse(); // We will reverse the activities array at the end - this is for faster array operations

  for (const message of messages) {
    let decryptedMessage: PlaintextMessage;
    try {
      const encryptedMessage = await encryptedMessageSchema.validate(message);
      decryptedMessage = await decryptMessage(
        encryptedMessage,
        recipientPrivateKey
      );
    } catch (error) {
      console.error("Invalid message received from server: ", message);
      continue;
    }

    const { metadata, type, data } = decryptedMessage;

    switch (type) {
      case JUB_SIGNAL_MESSAGE_TYPE.REGISTERED:
        try {
          if (metadata.fromPublicKey !== recipientPublicKey) {
            throw new Error(
              "Invalid message: registration messages must be sent from self"
            );
          }

          const { pk, msg, sig } = await registeredMessageSchema.validate(data);
          const userId = await hashPublicKeyToUUID(recipientPublicKey);
          const user = users[userId];
          if (user) {
            user.name = metadata.fromDisplayName;
            user.encPk = metadata.fromPublicKey;
            user.sigPk = pk;
            user.msg = msg;
            user.sig = sig;
            user.inTs = metadata.timestamp.toISOString();

            users[userId] = user;
          } else {
            users[userId] = {
              name: metadata.fromDisplayName,
              encPk: metadata.fromPublicKey,
              sigPk: pk,
              msg,
              sig,
              inTs: metadata.timestamp.toISOString(),
            };
          }

          const activity = {
            type: JUB_SIGNAL_MESSAGE_TYPE.REGISTERED,
            name: metadata.fromDisplayName,
            id: userId,
            ts: metadata.timestamp.toISOString(),
          };
          activities.push(activity);
        } catch (error) {
          console.error(
            "Invalid registered message received from server: ",
            message
          );
        } finally {
          break;
        }
      case JUB_SIGNAL_MESSAGE_TYPE.OUTBOUND_TAP:
        try {
          // An outbound tap sent from self is just to update the note
          if (metadata.fromPublicKey === recipientPublicKey) {
            const { name, pk, note } = await outboundTapMessageSchema.validate(
              data
            );
            const userId = await hashPublicKeyToUUID(pk);
            const user = users[userId];
            if (user) {
              user.note = note;

              users[userId] = user;
            } else {
              users[userId] = {
                name,
                encPk: pk,
                note,
                outTs: metadata.timestamp.toISOString(),
              };
            }
          } else {
            const { name, pk, note } = await outboundTapMessageSchema.validate(
              data
            );
            const userId = await hashPublicKeyToUUID(pk);
            const user = users[userId];
            if (user) {
              user.name = name;
              user.encPk = pk;
              user.note = note;
              user.outTs = metadata.timestamp.toISOString();

              users[userId] = user;
            } else {
              users[userId] = {
                name,
                encPk: pk,
                note,
                outTs: metadata.timestamp.toISOString(),
              };
            }

            const activity = {
              type: JUB_SIGNAL_MESSAGE_TYPE.OUTBOUND_TAP,
              name,
              id: userId,
              ts: metadata.timestamp.toISOString(),
            };
            activities.push(activity);
          }
        } catch (error) {
          console.error(
            "Invalid outbound tap message received from server: ",
            message
          );
        } finally {
          break;
        }
      case JUB_SIGNAL_MESSAGE_TYPE.INBOUND_TAP:
        try {
          const { name, encPk, x, tg, bio, pk, msg, sig } =
            await inboundTapMessageSchema.validate(data);
          const userId = await hashPublicKeyToUUID(encPk);
          const user = users[userId];
          if (user) {
            user.name = name;
            user.encPk = encPk;
            user.x = x;
            user.tg = tg;
            user.bio = bio;
            user.sigPk = pk;
            user.msg = msg;
            user.sig = sig;
            user.inTs = metadata.timestamp.toISOString();

            users[userId] = user;
          } else {
            users[userId] = {
              name,
              encPk,
              x,
              tg,
              bio,
              sigPk: pk,
              msg,
              sig,
              inTs: metadata.timestamp.toISOString(),
            };
          }

          const activity = {
            type: JUB_SIGNAL_MESSAGE_TYPE.INBOUND_TAP,
            name,
            id: userId,
            ts: metadata.timestamp.toISOString(),
          };
          activities.push(activity);
        } catch (error) {
          console.error(
            "Invalid inbound tap message received from server: ",
            message
          );
        } finally {
          break;
        }
      case JUB_SIGNAL_MESSAGE_TYPE.LOCATION_TAP:
        try {
          if (metadata.fromPublicKey !== recipientPublicKey) {
            throw new Error(
              "Invalid message: location tap messages must be sent from self"
            );
          }

          const { id, name, pk, msg, sig } =
            await locationTapMessageSchema.validate(data);
          const location = locationSignatures[id];
          if (location) {
            location.id = id;
            location.name = name;
            location.pk = pk;
            location.msg = msg;
            location.sig = sig;
            location.ts = metadata.timestamp.toISOString();

            locationSignatures[id] = location;
          } else {
            locationSignatures[id] = {
              id,
              name,
              pk,
              msg,
              sig,
              ts: metadata.timestamp.toISOString(),
            };
          }

          const activity = {
            type: JUB_SIGNAL_MESSAGE_TYPE.LOCATION_TAP,
            name,
            id,
            ts: metadata.timestamp.toISOString(),
          };
          activities.push(activity);
        } catch (error) {
          console.error(
            "Invalid location tap message received from server: ",
            message
          );
        } finally {
          break;
        }
      case JUB_SIGNAL_MESSAGE_TYPE.QUEST_COMPLETED:
        try {
          if (metadata.fromPublicKey !== recipientPublicKey) {
            throw new Error(
              "Invalid message: quest completed messages must be sent from self"
            );
          }

          const { id, name, pfId } = await questCompletedMessageSchema.validate(
            data
          );
          const quest = questCompleted[id];
          if (quest) {
            quest.id = id;
            quest.name = name;
            quest.pfId = pfId;
            quest.ts = metadata.timestamp.toISOString();

            questCompleted[id] = quest;
          } else {
            questCompleted[id] = {
              id,
              name,
              pfId,
              ts: metadata.timestamp.toISOString(),
            };
          }

          const activity = {
            type: JUB_SIGNAL_MESSAGE_TYPE.QUEST_COMPLETED,
            name,
            id,
            ts: metadata.timestamp.toISOString(),
          };
          activities.push(activity);
        } catch (error) {
          console.error(
            "Invalid quest completed message received from server: ",
            message
          );
        } finally {
          break;
        }
      case JUB_SIGNAL_MESSAGE_TYPE.ITEM_REDEEMED:
        try {
          const { id, name, qrId } = await itemRedeemedMessageSchema.validate(
            data
          );
          const item = itemRedeemed[id];
          if (item) {
            item.id = id;
            item.name = name;
            item.qrId = qrId;
            item.ts = metadata.timestamp.toISOString();

            itemRedeemed[id] = item;
          } else {
            itemRedeemed[id] = {
              id,
              name,
              qrId,
              ts: metadata.timestamp.toISOString(),
            };
          }

          const activity = {
            type: JUB_SIGNAL_MESSAGE_TYPE.ITEM_REDEEMED,
            name,
            id,
            ts: metadata.timestamp.toISOString(),
          };
          activities.push(activity);
        } catch (error) {
          console.error(
            "Invalid item redeemed message received from server: ",
            message
          );
        } finally {
          break;
        }
      default:
        console.error("Received invalid message type");
    }
  }

  activities.reverse(); // We want activities to be in reverse chronological order

  return {
    newUsers: users,
    newLocationSignatures: locationSignatures,
    newQuestCompleted: questCompleted,
    newItemRedeemed: itemRedeemed,
    newActivities: activities,
  };
};
