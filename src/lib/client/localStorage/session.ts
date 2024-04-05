import {
  deleteFromLocalStorage,
  getFromLocalStorage,
  saveToLocalStorage,
} from ".";

export const SESSION_STORAGE_KEY = "session";

export type AuthToken = {
  value: string;
  expiresAt: Date;
};

export type Session = {
  authToken: AuthToken;
  lastMessageFetchTimestamp?: Date;
};

export const saveSession = (session: Session): void => {
  saveToLocalStorage(SESSION_STORAGE_KEY, JSON.stringify(session));
};

export const getSession = (): Session | undefined => {
  const session = getFromLocalStorage(SESSION_STORAGE_KEY);
  if (session) {
    const parsedSession = JSON.parse(session);
    if (parsedSession.lastMessageFetchTimestamp) {
      parsedSession.lastMessageFetchTimestamp = new Date(
        parsedSession.lastMessageFetchTimestamp
      );
    }
    parsedSession.authToken.expiresAt = new Date(
      parsedSession.authToken.expiresAt
    );

    return parsedSession;
  }

  return undefined;
};

export const saveAuthToken = (token: AuthToken): void => {
  const session = getSession();
  if (session) {
    session.authToken = token;
    saveSession(session);
  } else {
    const newSession = { authToken: token };
    saveSession(newSession);
  }
};

export const getAuthToken = (): AuthToken | undefined => {
  const session = getSession();
  if (session) {
    return session.authToken;
  }

  return undefined;
};

export const deleteSession = (): void => {
  deleteFromLocalStorage(SESSION_STORAGE_KEY);
};
