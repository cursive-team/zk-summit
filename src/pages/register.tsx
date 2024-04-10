import React, { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/router";
import { v4 as uuidv4 } from "uuid";
import { generateEncryptionKeyPair } from "@/lib/client/encryption";
import { sign } from "@/lib/shared/signature";
import { generateSalt, hashPassword } from "@/lib/client/utils";
import {
  createBackup,
  deleteAccountFromLocalStorage,
  saveAuthToken,
  saveKeys,
  saveProfile,
} from "@/lib/client/localStorage";
import { encryptBackupString } from "@/lib/shared/backup";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { FormStepLayout } from "@/layouts/FormStepLayout";
import { toast } from "sonner";
import { loadMessages } from "@/lib/client/jubSignalClient";
import { encryptRegisteredMessage } from "@/lib/client/jubSignal/registered";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { startRegistration } from "@simplewebauthn/browser";
import {
  telegramUsernameRegex,
  twitterUsernameRegex,
} from "@/lib/shared/utils";
import { supabase } from "@/lib/client/realtime";
import { generatePSIKeys, psiBlobUploadClient } from "@/lib/client/psi";
import { classed } from "@tw-classed/react";
import { Card } from "@/components/cards/Card";
import { Spinner } from "@/components/Spinner";
import Link from "next/link";
import { logClientEvent } from "@/lib/client/metrics";
import { useWorker } from "@/hooks/useWorker";

enum DisplayState {
  PASSKEY,
  PASSWORD,
  CREATING,
}

const Title = classed.h3("font-medium text-primary text-base text-center");
const Description = classed.div(
  Card.Base,
  "p-2 text-[14px] font-normal font-sans !border-none text-iron-950 !rounded-[8px]"
);
const Underline = classed.span("text-primary");
export default function Register() {
  const router = useRouter();
  const [displayState, setDisplayState] = useState<DisplayState>(
    DisplayState.PASSKEY
  );
  const [displayName, setDisplayName] = useState<string>();
  const [twitter, setTwitter] = useState<string>("@");
  const [telegram, setTelegram] = useState<string>("@");
  const [bio, setBio] = useState<string>();
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [iykRef, setIykRef] = useState<string>("");
  const [mockRef, setMockRef] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [isAccountReady, setIsAccountReady] = useState(false);

  const { work } = useWorker();

  useEffect(() => {
    if (router.query.iykRef) {
      setIykRef(router.query.iykRef as string);
    } else {
      toast.error("Please tap your card to link it to your account.");
      return;
    }

    if (router.query.mockRef) {
      setMockRef(router.query.mockRef as string);
    }
  }, [router.query]);

  const checkUsernameIsUnique = async (
    displayName: string
  ): Promise<boolean> => {
    const response = await fetch(
      `/api/register/check_username?displayName=${displayName}`
    );
    if (!response.ok) {
      console.error(
        `HTTP error when checking username uniqueness! status: ${response.status}`
      );
      return false;
    }

    const data = await response.json();

    return data.isUnique;
  };

  const handleCreateWithPassword = async () => {
    logClientEvent("registerAttemptCreateWithPassword", {});

    if (!iykRef) {
      toast.error("Please tap your card to link it to your account.");
      return;
    }

    if (
      !displayName ||
      /^\s|\s$/.test(displayName) ||
      displayName.length > 20
    ) {
      toast.error(
        "Display name cannot have leading or trailing whitespace and must be 20 characters or less"
      );
      return;
    }

    if (twitter !== "@" && !twitterUsernameRegex.test(twitter)) {
      toast.error("Please enter a valid Twitter username.");
      return;
    }

    if (telegram !== "@" && !telegramUsernameRegex.test(telegram)) {
      toast.error("Please enter a valid Telegram username.");
      return;
    }

    if (bio && bio.length > 200) {
      toast.error("Bio must be 200 characters or less.");
      return;
    }

    const isUsernameUnique = await checkUsernameIsUnique(displayName);
    if (!isUsernameUnique) {
      toast.error("Username is already taken.");
      return;
    }

    logClientEvent("registerSuccessCreateWithPassword", {});

    setDisplayState(DisplayState.PASSWORD);
  };

  const handleCreateWithPasskey = () => {
    logClientEvent("registerSuccessCreateWithPasskey", {});

    setDisplayState(DisplayState.PASSKEY);
  };

  const handleSubmitWithPasskey = async (e: FormEvent<Element>) => {
    e.preventDefault();

    logClientEvent("registerAttemptSubmitWithPasskey", {});

    if (!iykRef) {
      toast.error("Please tap your card to link it to your account.");
      return;
    }

    if (
      !displayName ||
      /^\s|\s$/.test(displayName) ||
      displayName.length > 20
    ) {
      toast.error(
        "Display name cannot have leading or trailing whitespace and must be 20 characters or less"
      );
      return;
    }

    if (twitter !== "@" && !twitterUsernameRegex.test(twitter)) {
      toast.error("Please enter a valid Twitter username.");
      return;
    }

    if (telegram !== "@" && !telegramUsernameRegex.test(telegram)) {
      toast.error("Please enter a valid Telegram username.");
      return;
    }

    if (bio && bio.length > 200) {
      toast.error("Bio must be 200 characters or less.");
      return;
    }

    logClientEvent("registerSuccessSubmitWithPasskey", {});

    setLoading(true);

    const isUsernameUnique = await checkUsernameIsUnique(displayName);
    if (!isUsernameUnique) {
      toast.error("Username is already taken.");
      return;
    }

    const registrationOptions = await generateRegistrationOptions({
      rpName: "zk-summit",
      rpID: window.location.hostname,
      userID: displayName,
      userName: displayName,
      attestationType: "none",
    });

    try {
      const { id, response: authResponse } = await startRegistration(
        registrationOptions
      );
      const authPublicKey = authResponse.publicKey;
      if (!authPublicKey) {
        throw new Error("No public key returned from authenticator");
      }

      await createAccount(displayName, id, authPublicKey);
    } catch (error) {
      console.error("Error creating account: ", error);
      toast.error("Authentication failed! Please try again.");
      setLoading(false);
      return;
    }
  };

  const handleSubmitWithPassword = async (e: FormEvent<Element>) => {
    e.preventDefault();

    if (!displayName || !password) {
      toast.error("Please enter a username and password.");
      return;
    }

    if (password.length < 5) {
      toast.error("Password must be at least 5 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    logClientEvent("registerSuccessSubmitWithPassword", {});

    setLoading(true);

    await createAccount(displayName, password, undefined);
  };

  const createAccount = async (
    displayName: string,
    password: string,
    authPublicKey: string | undefined
  ) => {
    setLoading(true);
    const prevDisplayState = displayState;
    setDisplayState(DisplayState.CREATING); // Show the loading spinner

    const { privateKey, publicKey } = await generateEncryptionKeyPair();
    const { psiPrivateKeys, psiPublicKeys } = await generatePSIKeys();

    // upload psi keys to blob
    const psiPublicKeysLink = await psiBlobUploadClient(
      "psiPublicKeys",
      JSON.stringify(psiPublicKeys)
    );

    // set up realtime account
    const { data: authData, error: authError } =
      await supabase.auth.signInAnonymously();
    if (!authData) {
      console.error("Error with realtime auth.", authError);
      toast.error("Error with PSI account setup.");
      setLoading(false);
      setDisplayState(prevDisplayState);
      return;
    }

    let passwordSalt, passwordHash;
    passwordSalt = generateSalt();
    passwordHash = await hashPassword(password, passwordSalt);

    const response = await fetch("/api/register/create_account", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        iykRef,
        mockRef,
        displayName,
        encryptionPublicKey: publicKey,
        psiPublicKeysLink,
        passwordSalt,
        passwordHash,
        authPublicKey,
        twitter,
        telegram,
        bio,
      }),
    });

    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`);
      toast.error("Error creating account! Please try again.");
      setLoading(false);
      setDisplayState(prevDisplayState);
      return;
    }

    const data = await response.json();
    const { authToken, signingKey, verifyingKey } = data;
    if (!authToken || !authToken.value || !authToken.expiresAt) {
      console.error("Account created, but no auth token returned.");
      toast.error("Account created, but error logging in! Please try again.");
      setLoading(false);
      return;
    }

    if (!signingKey || !verifyingKey) {
      console.error("Account created, but no keys returned.");
      toast.error(
        "Error generating keys. Please talk to a member of the Cursive team."
      );
      setLoading(false);
      setDisplayState(prevDisplayState);
      return;
    }

    // Ensure the user is logged out of an existing session before creating a new account
    deleteAccountFromLocalStorage();
    saveKeys({
      encryptionPrivateKey: privateKey,
      signaturePrivateKey: signingKey,
      psiPrivateKeys,
      psiPublicKeysLink,
    });
    saveProfile({
      displayName,
      encryptionPublicKey: publicKey,
      signaturePublicKey: verifyingKey,
      twitterUsername: twitter,
      telegramUsername: telegram,
      bio,
    });
    saveAuthToken({
      value: authToken.value,
      expiresAt: new Date(authToken.expiresAt),
    });

    let backupData = createBackup();
    if (!backupData) {
      console.error("Error creating backup!");
      toast.error("Error creating backup! Please try again.");
      setLoading(false);
      setDisplayState(prevDisplayState);
      return;
    }

    const backup = encryptBackupString(backupData, displayName, password);

    const backupResponse = await fetch("/api/backup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        backup,
        authToken: authToken.value,
      }),
    });

    if (!backupResponse.ok) {
      console.error(`HTTP error! status: ${backupResponse.status}`);
      toast.error("Error storing backup! Please try again.");
      setLoading(false);
      return;
    }

    // Send a jubSignal message to self to store the signature
    const dataToSign = uuidv4().replace(/-/g, ""); // For now, we just sign a random uuid as a hex string
    const signature = sign(signingKey, dataToSign);
    const recipientPublicKey = publicKey;
    const encryptedMessage = await encryptRegisteredMessage({
      signaturePublicKey: verifyingKey,
      signatureMessage: dataToSign,
      signature,
      senderPrivateKey: privateKey,
      recipientPublicKey,
    });
    try {
      await loadMessages({
        forceRefresh: false,
        messageRequests: [
          {
            encryptedMessage,
            recipientPublicKey,
          },
        ],
      });
    } catch (error) {
      console.error("Error sending registration tap to server: ", error);
      toast.error("An error occured while registering.");
      setLoading(false);
      return;
    }

    // Begin downloading params in web worker
    work([], []);

    setIsAccountReady(true);
    setLoading(false);
  };

  const StateContent: Record<DisplayState, JSX.Element> = {
    [DisplayState.PASSKEY]: (
      <FormStepLayout
        title="zkSummit 11 x Cursive"
        subtitle="Set up socials to share when others tap your badge. Register to maintain an encrypted backup of data you collect."
        className="pt-4"
        onSubmit={handleSubmitWithPasskey}
      >
        <Input
          type="text"
          id="displayName"
          label="Username (*)"
          placeholder="Tom Smith"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <Input
          type="text"
          id="twitter"
          label="X"
          placeholder="@username"
          value={twitter}
          onChange={(e) =>
            setTwitter(
              e.target.value.charAt(0) === "@"
                ? e.target.value
                : "@" + e.target.value
            )
          }
        />
        <Input
          type="text"
          id="telegram"
          label="Telegram"
          placeholder="@username"
          value={telegram}
          onChange={(e) =>
            setTelegram(
              e.target.value.charAt(0) === "@"
                ? e.target.value
                : "@" + e.target.value
            )
          }
        />
        <Input
          type="text"
          id="bio"
          label="Bio"
          placeholder="Your organization, website, other info"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />
        <Button type="submit" loading={loading}>
          Register with passkey
        </Button>
        <span
          className="text-center text-sm"
          onClick={handleCreateWithPassword}
        >
          <u>Register with password instead</u>
        </span>
      </FormStepLayout>
    ),
    [DisplayState.PASSWORD]: (
      <FormStepLayout
        title="zkSummit 11 x Cursive"
        subtitle="Choose a master password to maintain an encrypted backup of data you collect."
        className="pt-4"
        onSubmit={handleSubmitWithPassword}
      >
        <Input
          type="password"
          id="password"
          label="Master password"
          placeholder=""
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Input
          type="password"
          id="confirmPassword"
          label="Confirm master password"
          placeholder=""
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        <Button type="submit" loading={loading}>
          Register
        </Button>
        <span className="text-center text-sm" onClick={handleCreateWithPasskey}>
          <u>Register with passkey instead</u>
        </span>
      </FormStepLayout>
    ),
    [DisplayState.CREATING]: (
      <div className="h-full flex flex-col pt-4 pb-8 ">
        <div className="flex flex-col my-auto justify-center">
          <Title>
            <div className="flex items-center justify-center m-4 gap-2">
              {isAccountReady ? "Account created!" : "Creating account"}
              {!isAccountReady && (
                <Spinner size={20} className="!text-primary" />
              )}
            </div>
          </Title>
          <div className="flex flex-col gap-2 m-4">
            <Description>
              <span>
                Look for cards to <Underline>tap into talks</Underline> to prove
                your attendance and ZK interests.
              </span>
            </Description>
            <Description>
              <span>
                Tap your badge to a phone to easily{" "}
                <Underline>share socials</Underline> with new connections.
              </span>
            </Description>
            <Description>
              <span>
                {" "}
                Use 2PC+FHE to{" "}
                <Underline> discover what you have in common</Underline> with
                other attendees.
              </span>
            </Description>
          </div>
        </div>
        {isAccountReady && (
          <Link href="/">
            <Button className="mt-auto">Enter the app!</Button>
          </Link>
        )}
      </div>
    ),
  };

  return <>{StateContent?.[displayState]}</>;
}

Register.getInitialProps = () => {
  return { fullPage: true };
};
