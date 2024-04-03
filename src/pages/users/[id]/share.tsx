import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import {
  fetchUserByUUID,
  getAuthToken,
  getKeys,
  getProfile,
  getUsers,
  User,
} from "@/lib/client/localStorage";
import {
  encryptInboundTapMessage,
  encryptOutboundTapMessage,
} from "@/lib/client/jubSignal";
import { sign } from "@/lib/shared/signature";
import { Button } from "@/components/Button";
import { FormStepLayout } from "@/layouts/FormStepLayout";
import { Input } from "@/components/Input";
import { AppBackHeader } from "@/components/AppHeader";
import { toast } from "sonner";
import { loadMessages } from "@/lib/client/jubSignalClient";
import { Checkbox } from "@/components/Checkbox";
import {
  InputWrapper,
  InputDescription as Description,
} from "@/components/input/InputWrapper";
import { v4 as uuidv4 } from "uuid";
import { Spinner } from "@/components/Spinner";
import { MessageRequest } from "@/pages/api/messages";
import { ArtworkSnapshot } from "@/components/artwork/ArtworkSnapshot";
import useSettings from "@/hooks/useSettings";

const SharePage = () => {
  const router = useRouter();
  const { id } = router.query;
  const [user, setUser] = useState<User>();
  const [profile, setProfile] = useState(getProfile());
  const [shareTwitter, setShareTwitter] = useState(false);
  const [shareTelegram, setShareTelegram] = useState(false);
  const [shareBio, setShareBio] = useState(false);
  const [privateNote, setPrivateNote] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [loadingUser, setLoadingUser] = useState(false);

  const { pageWidth } = useSettings();

  useEffect(() => {
    if (typeof id === "string") {
      const profile = getProfile();
      if (!profile) {
        toast.error("You must be logged in to connect");
        router.push("/login");
        return;
      }
      setProfile(profile);

      setLoadingUser(true);
      const fetchedUser = fetchUserByUUID(id);
      if (fetchedUser) {
        if (fetchedUser.encPk === profile.encryptionPublicKey) {
          router.push("/");
          return;
        }

        if (fetchedUser.outTs) {
          router.push(`/users/${id}?alreadyConnected=true`);
          return;
        }

        setUser(fetchedUser);
        setLoadingUser(false);
      }
    }
  }, [id, router]);

  const handleConnect = async (event: React.FormEvent) => {
    event.preventDefault();

    setLoading(true);

    if (!user) {
      toast.error("An error occurred. Please try again.");
      router.push("/");
      return;
    }

    const authToken = getAuthToken();
    if (!authToken || authToken.expiresAt < new Date()) {
      toast.error("You must be logged in to connect");
      router.push("/login");
      return;
    }

    const keys = getKeys();
    if (!keys) {
      console.error("Cannot find user keys");
      toast.error("You must be logged in to connect");
      router.push("/login");
      return;
    }
    const { encryptionPrivateKey, signaturePrivateKey } = keys;

    const profile = getProfile();
    if (!profile) {
      console.error("Cannot find user profile");
      toast.error("You must be logged in to connect");
      router.push("/login");
      return;
    }

    // ----- SEND MESSAGE TO OTHER USER -----
    // This messages sends contact information to the other user
    const dataToSign = uuidv4().replace(/-/g, ""); // For now, we just sign a random uuid as a hex string
    const signature = sign(signaturePrivateKey, dataToSign);
    const recipientPublicKey = user.encPk;
    const encryptedMessage = await encryptInboundTapMessage({
      twitterUsername: shareTwitter ? profile.twitterUsername : undefined,
      telegramUsername: shareTelegram ? profile.telegramUsername : undefined,
      bio: shareBio ? profile.bio : undefined,
      signaturePublicKey: profile.signaturePublicKey,
      signatureMessage: dataToSign,
      signature,
      senderPrivateKey: encryptionPrivateKey,
      recipientPublicKey,
    });
    const otherUserMessageRequest: MessageRequest = {
      encryptedMessage,
      recipientPublicKey,
    };

    // ----- SEND MESSAGE TO SELF -----
    // This message records the outbound interaction and saves the private note
    const selfPublicKey = profile.encryptionPublicKey;
    const selfEncryptedMessage = await encryptOutboundTapMessage({
      displayName: user.name,
      encryptionPublicKey: user.encPk,
      privateNote,
      senderPrivateKey: encryptionPrivateKey,
      recipientPublicKey: selfPublicKey,
    });
    const selfMessageRequest: MessageRequest = {
      encryptedMessage: selfEncryptedMessage,
      recipientPublicKey: selfPublicKey,
    };

    // Send both messages and update activity feed
    try {
      await loadMessages({
        forceRefresh: false,
        messageRequests: [otherUserMessageRequest, selfMessageRequest],
      });
      toast.success(`Successfully shared information with ${user.name}!`);
      setLoading(false);
    } catch (error) {
      console.error("Error sending encrypted tap to server: ", error);
      toast.error(
        "An error occurred while sending the message. Please try again."
      );
      setLoading(false);
      return;
    }

    router.push(`/users/${id}`);
  };

  if (!profile || loadingUser) {
    return <Spinner />;
  }

  if (!user) {
    return <div>User not found</div>;
  }

  const hasSocialLinks = profile.twitterUsername || profile.telegramUsername;
  const artworkSize = (pageWidth - 32) / 2;

  return (
    <div>
      <AppBackHeader redirectTo="/" />
      <FormStepLayout
        className="!pt-0"
        title={
          <span className="text-base text-gray-12 !pb-1">{`Share with ${user.name}`}</span>
        }
        onSubmit={handleConnect}
      >
        <Description>
          You will send {user.name} a{" "}
          <i>unique, signed version of your stamp</i>. It will be added to their
          ETHDenver commemorative NFT, and they can use the signature to ZK
          prove they met you for quests.
        </Description>

        <div className="mx-auto">
          <ArtworkSnapshot
            width={artworkSize}
            height={artworkSize}
            pubKey={profile.signaturePublicKey}
            isVisible
          />
        </div>
        {!hasSocialLinks && !profile.bio && (
          <Description>
            {`No socials set up. Add your socials in the upper-right menu from the home page to selectively share upon tap!`}
          </Description>
        )}
        {(hasSocialLinks || profile.bio) && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              <InputWrapper
                size="sm"
                label={`Choose socials to share`}
                className="grid grid-cols-2 gap-2"
                spacing
              >
                {profile.twitterUsername && (
                  <Checkbox
                    id="twitter"
                    label="X"
                    checked={shareTwitter}
                    type="button"
                    onChange={setShareTwitter}
                  />
                )}
                {profile.telegramUsername && (
                  <Checkbox
                    id="telegram"
                    label="Telegram"
                    checked={shareTelegram}
                    type="button"
                    onChange={setShareTelegram}
                  />
                )}
                {profile.bio && (
                  <Checkbox
                    id="bio"
                    label="Bio"
                    checked={shareBio}
                    type="button"
                    onChange={setShareBio}
                  />
                )}
              </InputWrapper>
            </div>
          </div>
        )}
        <Input
          type="longtext"
          label="Private note"
          placeholder="e.g Met on Saturday"
          textSize="sm"
          description={
            <>
              <span className="block">
                {`Use to help remember your interaction with ${user.name}.`}
              </span>
              <span className="block">Only you will see this.</span>
            </>
          }
          value={privateNote}
          onChange={(event) => {
            setPrivateNote(event.target.value);
          }}
        />
        <Button loading={loading} type="submit">
          Submit
        </Button>
      </FormStepLayout>
    </div>
  );
};

SharePage.getInitialProps = () => {
  return { fullPage: true };
};

export default SharePage;
