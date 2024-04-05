import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import {
  fetchUserByUUID,
  getKeys,
  getLocationSignatures,
  getProfile,
  getUsers,
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
import { toast } from "sonner";
import { generateSelfBitVector, psiBlobUploadClient } from "@/lib/client/psi";
import init, { round1_js, round2_js, round3_js } from "@/lib/mp_psi/mp_psi";
import { encryptOverlapComputedMessage } from "@/lib/client/jubSignal/overlapComputed";
import { loadMessages } from "@/lib/client/jubSignalClient";
import { CircleCard } from "@/components/cards/CircleCard";

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
        <Icons.ExternalLink size={18} />
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
  JUBSIGNAL,
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
  const [round2Order, setRound2Order] = useState<boolean>();
  const [otherRound3MessageLink, setOtherRound3MessageLink] =
    useState<string>();
  const [selfRound3Output, setSelfRound3Output] = useState<any>();

  const [userOverlap, setUserOverlap] = useState<
    { userId: string; name: string }[]
  >([]);
  const [locationOverlap, setLocationOverlap] = useState<
    { locationId: string; name: string }[]
  >([]);

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
      .on("presence", { event: "leave" }, async ({ key }) => {
        if (key === otherEncPk) {
          toast.error(`${user?.name} left before computation finished.`);
          setPsiState(PSIState.NOT_STARTED);
          await closeChannel();
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

  const closeChannel = async () => {
    if (!channelName) return;
    await supabase.removeChannel(supabase.channel(channelName));
  };

  const processOverlap = (overlap: number[]) => {
    const users = getUsers();
    const locations = getLocationSignatures();
    let locationOverlapIds = [];
    let userOverlapIds = [];

    for (let i = 0; i < overlap.length; i++) {
      if (overlap[i] >= 1000) {
        continue;
      } else if (overlap[i] > 500) {
        const locationId = (overlap[i] - 500).toString();
        locationOverlapIds.push({
          locationId,
          name: locations[locationId].name,
        });
      } else {
        for (const userId in users) {
          if (parseInt(users[userId].pkId) === overlap[i]) {
            userOverlapIds.push({
              userId,
              name: users[userId].name,
            });
          }
        }
      }
    }
    // console.log(userOverlapIds);
    setUserOverlap(userOverlapIds);
    setLocationOverlap(locationOverlapIds);
  };

  // process broadcast events
  useEffect(() => {
    if (!broadcastEvent) return;

    console.log(broadcastEvent);

    const { payload } = broadcastEvent;
    if (payload.state === PSIState.ROUND2 && payload.to === selfEncPk) {
      setOtherRound2MessageLink(payload.data);
      setRound2Order(parseInt(payload.otherPkId) > parseInt(user?.pkId!));
    } else if (payload.state === PSIState.ROUND3 && payload.to === selfEncPk) {
      setOtherRound3MessageLink(payload.data);
    }
  }, [broadcastEvent, user?.pkId!]);

  // process state changes
  useEffect(() => {
    if (
      selfRound1Output &&
      otherRound2MessageLink &&
      round2Order !== undefined &&
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
      setPsiState(PSIState.JUBSIGNAL);
    }
  }, [
    psiState,
    selfRound1Output,
    otherRound2MessageLink,
    round2Order,
    selfRound2Output,
    otherRound3MessageLink,
    selfRound3Output,
  ]);

  useEffect(() => {
    async function handleOverlapRounds() {
      if (!selfEncPk || !otherEncPk || !channelName) return;

      const keys = getKeys();
      if (!keys) return;
      const { psiPrivateKeys, psiPublicKeysLink } = keys;

      if (psiState === PSIState.ROUND1) {
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
            to: otherEncPk,
            otherPkId: user?.pkId, // hacky way of getting our own pkId
          },
        });
      } else if (psiState === PSIState.ROUND2) {
        await init();
        const round2Output = round2_js(
          {
            psi_keys: psiPrivateKeys,
            message_round1: JSON.parse(
              await fetch(psiPublicKeysLink).then((res) => res.text())
            ),
          },
          selfRound1Output,
          JSON.parse(
            await fetch(otherRound2MessageLink!).then((res) => res.text())
          ),
          round2Order!
        );
        setSelfRound2Output(round2Output);

        const round3MessageLink = await psiBlobUploadClient(
          "round3Message",
          JSON.stringify(round2Output.message_round3)
        );

        supabase.channel(channelName).send({
          type: "broadcast",
          event: "message",
          payload: {
            state: PSIState.ROUND3,
            data: round3MessageLink,
            to: otherEncPk,
          },
        });
      } else if (psiState === PSIState.ROUND3) {
        await init();
        const psiOutput = round3_js(
          selfRound2Output!,
          JSON.parse(
            await fetch(otherRound3MessageLink!).then((res) => res.text())
          )
        );
        let overlapIndices = [];
        for (let i = 0; i < psiOutput.length; i++) {
          if (psiOutput[i] === 1) {
            overlapIndices.push(i);
          }
        }

        setSelfRound3Output(overlapIndices);
      } else if (psiState === PSIState.JUBSIGNAL) {
        await closeChannel();

        const encryptedMessage = await encryptOverlapComputedMessage(
          selfRound3Output,
          id?.toString()!,
          keys.encryptionPrivateKey,
          selfEncPk
        );

        try {
          await loadMessages({
            forceRefresh: false,
            messageRequests: [
              {
                encryptedMessage,
                recipientPublicKey: selfEncPk,
              },
            ],
          });
        } catch (error) {
          console.error(
            "Error sending encrypted location tap to server: ",
            error
          );
          toast.error(
            "An error occured while processing the tap. Please try again."
          );
          router.push("/");
          return;
        }

        processOverlap(selfRound3Output || []);
        setPsiState(PSIState.COMPLETE);
      }
    }

    handleOverlapRounds();
  }, [psiState, selfEncPk, otherEncPk, channelName]);

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
        if (fetchedUser.oI) {
          processOverlap(JSON.parse(fetchedUser.oI));
          setPsiState(PSIState.COMPLETE);
        } else {
          setOtherEncPk(fetchedUser.encPk);
          setSelfEncPk(profile.encryptionPublicKey);
          setChannelName(
            [fetchedUser.encPk, profile.encryptionPublicKey].sort().join("")
          );
        }
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
            <h2 className=" text-xl font-gray-12 font-normal">{user.name}</h2>
            <div className="flex items-center gap-1">
              {user.bio && (
                <span className="font-gray-12 text-[14px] mt-1 left-5">
                  {user.bio}
                </span>
              )}
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
        {psiState === PSIState.COMPLETE && (
          <InputWrapper
            label="Private overlap"
            description="Your common taps, snapshotted at when you met!"
          >
            <div className="flex flex-col mt-2 gap-1">
              {userOverlap.map(({ userId, name }, index) => {
                return (
                  <div
                    onClick={() => {
                      window.location.href = `/users/${userId}`;
                    }}
                    key={index}
                  >
                    <div className="flex justify-between border-b w-full border-gray-300  last-of-type:border-none first-of-type:pt-0 py-1">
                      <div className="flex items-center gap-2">
                        <div className="flex justify-center items-center bg-[#677363] h-6 w-6 rounded-full">
                          <CircleCard icon="person" />
                        </div>
                        <Card.Title>{name}</Card.Title>
                      </div>
                    </div>
                  </div>
                );
              })}
              {locationOverlap.map(({ locationId, name }, index) => {
                return (
                  <Link href={`/locations/${locationId}`} key={index}>
                    <div className="flex justify-between border-b w-full border-gray-300  last-of-type:border-none first-of-type:pt-0 py-1">
                      <div className="flex items-center gap-2">
                        <div className="flex justify-center items-center bg-[#677363] h-6 w-6 rounded-full">
                          <CircleCard icon="location" />
                        </div>
                        <Card.Title>{name}</Card.Title>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </InputWrapper>
        )}
        {user?.psiPkLink && psiState !== PSIState.COMPLETE && (
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
                loading={psiState !== PSIState.NOT_STARTED}
                type="button"
                onClick={setupChannel}
              >
                {psiState !== PSIState.NOT_STARTED
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
