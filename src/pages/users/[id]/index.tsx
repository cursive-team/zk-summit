import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import {
  fetchUserByUUID,
  getKeys,
  getProfile,
  User,
} from "@/lib/client/localStorage";
import { AppBackHeader } from "@/components/AppHeader";
import { Icons } from "@/components/Icons";
import { Card } from "@/components/cards/Card";
import Link from "next/link";
import { classed } from "@tw-classed/react";
import { labelStartWith, removeLabelStartWith } from "@/lib/shared/utils";
import { InputWrapper } from "@/components/input/InputWrapper";
import { ArtworkSnapshot } from "@/components/artwork/ArtworkSnapshot";
import { Button } from "@/components/Button";
import { supabase } from "@/lib/client/realtime";
import { RealtimeChannel } from "@supabase/supabase-js";
import { toast } from "sonner";
import { generateSelfBitVector, psiBlobUploadClient } from "@/lib/client/psi";
import init, { round1_js } from "@/lib/mp_psi/mp_psi";

const Label = classed.span("text-sm text-gray-12");

interface LinkCardProps {
  label?: string;
  href: string;
  value?: string;
}

const LinkCard = ({ label, value, href }: LinkCardProps) => {
  return (
    <Link href={href} target="_blank">
      <Card.Base className="flex items-center justify-between p-3">
        <div className="flex items-center gap-1">
          <Card.Title>{label}</Card.Title>
          <Card.Description>{value ?? "N/A"}</Card.Description>
        </div>
        <Icons.externalLink size={18} />
      </Card.Base>
    </Link>
  );
};

enum PSIState {
  NOT_STARTED,
  WAITING,
  ROUND1,
  ROUND2,
  ROUND3,
  COMPLETE,
}

const UserProfilePage = () => {
  const router = useRouter();
  const { id } = router.query;
  const [user, setUser] = useState<User>();
  const alreadyConnected = router?.query?.alreadyConnected === "true";

  const [selfEncPk, setSelfEncPk] = useState<string>();
  const [otherEncPk, setOtherEncPk] = useState<string>();
  const [channelName, setChannelName] = useState<string>();
  const [broadcastEvent, setBroadcastEvent] = useState<any>();

  const [psiState, setPsiState] = useState<PSIState>(PSIState.NOT_STARTED);
  const [selfRound1Output, setSelfRound1Output] = useState<any>();
  const [otherRound2MessageLink, setOtherRound2MessageLink] =
    useState<string>();
  const [selfRound2Output, setSelfRound2Output] = useState<any>();
  const [otherRound3MessageLink, setOtherRound3MessageLink] =
    useState<string>();
  const [selfRound3Output, setSelfRound3Output] = useState<any>();

  // set up channel for PSI
  const setupChannel = () => {
    if (!selfEncPk || !otherEncPk || !channelName) return;

    setPsiState(PSIState.WAITING);

    const channel = supabase.channel(channelName, {
      config: {
        presence: { key: selfEncPk },
      },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const newState = channel.presenceState();
        if (Object.keys(newState).includes(otherEncPk)) {
          setPsiState((prevState) => {
            if (prevState === PSIState.WAITING) {
              return PSIState.ROUND1;
            }
            return prevState;
          });
        }
      })
      .on("presence", { event: "leave" }, ({ key }) => {
        if (key === otherEncPk) {
          toast.error(`${user?.name} left before computation finished.`);
          setPsiState(PSIState.NOT_STARTED);
          supabase.removeChannel(supabase.channel(channelName));
        }
      })
      .on("broadcast", { event: "message" }, (event) => {
        setBroadcastEvent(event);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user: selfEncPk,
          });
        }
      });
  };

  // process broadcast events
  useEffect(() => {
    if (!broadcastEvent) return;

    const { payload } = broadcastEvent;
    if (payload.state === PSIState.ROUND2) {
      setOtherRound2MessageLink(payload.data);
    } else if (payload.state === PSIState.ROUND3) {
      setOtherRound3MessageLink(payload.data);
    }
  }, [broadcastEvent]);

  // process state changes
  useEffect(() => {
    if (
      selfRound1Output &&
      otherRound2MessageLink &&
      psiState === PSIState.ROUND1
    ) {
      setPsiState(PSIState.ROUND2);
    } else if (
      selfRound2Output &&
      otherRound3MessageLink &&
      psiState === PSIState.ROUND2
    ) {
      setPsiState(PSIState.ROUND3);
    } else if (selfRound3Output && psiState === PSIState.ROUND3) {
      setPsiState(PSIState.COMPLETE);
    }
  }, [
    psiState,
    selfRound1Output,
    otherRound2MessageLink,
    selfRound2Output,
    otherRound3MessageLink,
    selfRound3Output,
  ]);

  useEffect(() => {
    async function handleOverlapRounds() {
      if (!selfEncPk || !otherEncPk || !channelName) return;

      if (psiState === PSIState.ROUND1) {
        const keys = getKeys();
        if (!keys) return;

        const { psiPrivateKeys, psiPublicKeysLink } = keys;
        const selfBitVector = generateSelfBitVector();
        const otherPsiPublicKeysLink = user?.psiPkLink;

        await init();
        const round1Output = round1_js(
          {
            psi_keys: psiPrivateKeys,
            message_round1: JSON.parse(
              await fetch(psiPublicKeysLink).then((res) => res.text())
            ),
          },
          JSON.parse(
            await fetch(otherPsiPublicKeysLink!).then((res) => res.text())
          ),
          selfBitVector
        );
        setSelfRound1Output(round1Output);

        const round2MessageLink = await psiBlobUploadClient(
          "round2Message",
          JSON.stringify(round1Output.message_round2)
        );

        supabase.channel(channelName).send({
          type: "broadcast",
          event: "message",
          payload: {
            state: PSIState.ROUND2,
            data: round2MessageLink,
          },
        });
      }

      if (psiState === PSIState.ROUND2) {
      }
    }

    handleOverlapRounds();
  }, [psiState, selfEncPk, otherEncPk, channelName, user?.psiPkLink]);

  useEffect(() => {
    if (typeof id === "string") {
      const profile = getProfile();
      const keys = getKeys();
      if (!profile || !keys) {
        toast.error("You must be logged in to view this page.");
        router.push("/");
        return;
      }

      const fetchedUser = fetchUserByUUID(id);
      setUser(fetchedUser);

      if (fetchedUser) {
        setOtherEncPk(fetchedUser.encPk);
        setSelfEncPk(profile.encryptionPublicKey);
        setChannelName(
          [fetchedUser.encPk, profile.encryptionPublicKey].sort().join("")
        );
      }
    }
  }, [id, router]);

  if (!user) {
    return <div>User not found</div>;
  }

  return (
    <div>
      <AppBackHeader redirectTo="/" />
      {alreadyConnected && (
        <div className="flex items-start justify-center py-28">
          <span className="text-xl text-gray-12">
            You have already connected with this user!
          </span>
        </div>
      )}
      <div className="flex flex-col gap-6">
        <div className="flex gap-4 xs:gap-5 items-center">
          {user ? (
            <ArtworkSnapshot
              width={128}
              height={128}
              pubKey={user.sigPk ?? ""}
            />
          ) : (
            <ArtworkSnapshot width={128} height={128} pubKey={""} />
          )}
          <div className="flex flex-col gap-1">
            <h2 className=" text-xl font-gray-12 font-light">{user.name}</h2>
            <div className="flex items-center gap-1">
              <Icons.checkedCircle />
              <span className="text-sm font-light text-white">
                {user.outTs ? (
                  <Label>{`Shared on ${new Date(user.outTs).toLocaleString(
                    undefined,
                    {
                      dateStyle: "medium",
                    }
                  )}`}</Label>
                ) : (
                  <Label>{`Not yet connected.`}</Label>
                )}
              </span>
            </div>
          </div>
        </div>
        {!user.inTs && (
          <div className="p-3 bg-zinc-900 rounded flex-col justify-center items-start gap-1 inline-flex">
            <InputWrapper
              className="flex flex-col gap-2"
              label="Details pending"
            >
              <span className="text-gray-11 text-[14px] left-5 mt-1">
                If {user.name} taps you back and shares their socials, they will
                appear here.
              </span>
            </InputWrapper>
          </div>
        )}
        {(user.x || user.tg || user.fc) && (
          <div className="flex flex-col gap-1">
            {(user.x?.length ?? 0) > 1 && (
              <LinkCard
                label="Twitter"
                href={`https://x.com/${removeLabelStartWith(user.x, "@")}`}
                value={labelStartWith(user.x, "@")}
              />
            )}
            {(user.tg?.length ?? 0) > 1 && (
              <LinkCard
                label="Telegram"
                href={`https://t.me/${removeLabelStartWith(user.tg, "@")}`}
                value={labelStartWith(user.tg, "@")}
              />
            )}
            {(user.fc?.length ?? 0) > 1 && (
              <LinkCard
                label="Farcaster"
                href={`https://warpcast.com/${removeLabelStartWith(
                  user.fc,
                  "@"
                )}`}
                value={labelStartWith(user.fc, "@")}
              />
            )}
          </div>
        )}
        {user.bio && (
          <InputWrapper className="flex flex-col gap-2" label={`Bio`}>
            <span className="text-gray-11 text-[14px] mt-1 left-5">
              {user.bio}
            </span>
          </InputWrapper>
        )}
        {user?.note && (
          <InputWrapper
            className="flex flex-col gap-2"
            label="Your private note"
          >
            <span className="text-gray-11 text-[14px] mt-1 left-5">
              {user?.note}
            </span>
          </InputWrapper>
        )}
        {user?.psiPkLink && (
          <div className="flex flex-col gap-4">
            <InputWrapper
              size="sm"
              label={`Connect over mutual connections and talks`}
              className="grid grid-cols-1"
              spacing
            >
              <span className="text-gray-11 text-[14px] mb-4 left-5">
                If both you and {user.name} opt-in, we will use 2PC+FHE to
                privately compute your mutual connections and talks as a
                conversation starter.
              </span>
              <Button
                loading={
                  psiState !== PSIState.NOT_STARTED &&
                  psiState !== PSIState.COMPLETE
                }
                type="button"
                onClick={setupChannel}
              >
                {psiState !== PSIState.NOT_STARTED &&
                psiState !== PSIState.COMPLETE
                  ? "Computing..."
                  : "Discover mutuals"}
              </Button>
            </InputWrapper>
          </div>
        )}
      </div>
    </div>
  );
};

UserProfilePage.getInitialProps = () => {
  return { showHeader: false, showFooter: true };
};

export default UserProfilePage;
