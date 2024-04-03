import { Icons } from "@/components/Icons";
import { ProfileImage } from "@/components/ProfileImage";
import { TabsProps, Tabs } from "@/components/Tabs";
import { Card } from "@/components/cards/Card";
import { ListLayout } from "@/layouts/ListLayout";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  Activity,
  Profile,
  User,
  getActivities,
  getAuthToken,
  getKeys,
  getProfile,
  getUsers,
} from "@/lib/client/localStorage";
import { JUB_SIGNAL_MESSAGE_TYPE } from "@/lib/client/jubSignal";
import { SnapshotModal } from "@/components/modals/SnapshotModal";
import { Button } from "@/components/Button";
import { formatDate } from "@/lib/shared/utils";
import { loadMessages } from "@/lib/client/jubSignalClient";
import { Spinner } from "@/components/Spinner";
import { CircleCard } from "@/components/cards/CircleCard";
import { ArtworkSnapshot } from "@/components/artwork/ArtworkSnapshot";
import useSettings from "@/hooks/useSettings";
import { useStateMachine } from "little-state-machine";
import updateStateFromAction from "@/lib/shared/updateAction";

interface ContactCardProps {
  name: string;
  userId: string;
  date: string;
}

const ContactCard = ({ name, userId, date }: ContactCardProps) => {
  return (
    <Link href={`/users/${userId}`}>
      <Card.Base className="flex justify-between p-3">
        <Card.Title className="leading-none">{name}</Card.Title>
        <Card.Description>{date}</Card.Description>
      </Card.Base>
    </Link>
  );
};

const PendingContactCard = ({ name, userId, date }: ContactCardProps) => {
  return (
    <Card.Base className="flex items-center justify-between p-3">
      <div className="flex items-center gap-2">
        <Card.Title className="leading-none">{name}</Card.Title>
        <Card.Description>{date}</Card.Description>
      </div>
      <div>
        <Link href={`/users/${userId}/share`}>
          <Button variant="secondary" size="sm">
            Share back
          </Button>
        </Link>
      </div>
    </Card.Base>
  );
};

interface ActivityFeedProps {
  type: JUB_SIGNAL_MESSAGE_TYPE;
  name: string;
  id: string;
  date: string;
}

interface FeedContentProps {
  title: React.ReactNode;
  description: string;
  icon: React.ReactNode;
}
const FeedContent = ({ title, description, icon }: FeedContentProps) => {
  return (
    <div className="grid grid-cols-[1fr_80px] items-center justify-between py-1 gap-4">
      <div className="grid grid-cols-[24px_1fr] items-center gap-2">
        <div className="flex justify-center items-center h-6 w-6 rounded-full bg-[#323232]">
          {icon}
        </div>
        <Card.Title>{title}</Card.Title>
      </div>
      <Card.Description>{description}</Card.Description>
    </div>
  );
};

const ActivityFeed = ({ type, name, id, date }: ActivityFeedProps) => {
  switch (type) {
    case JUB_SIGNAL_MESSAGE_TYPE.REGISTERED:
      const profile = getProfile();
      if (
        profile?.bio ||
        profile?.telegramUsername ||
        profile?.twitterUsername
      ) {
        return (
          <FeedContent
            title="Registered and set up socials!"
            description={date}
            icon={<CircleCard icon="proof" />}
          />
        );
      }
      return (
        <FeedContent
          title="Registered! Set up your socials in upper-right menu."
          description={date}
          icon={<CircleCard icon="proof" />}
        />
      );
    case JUB_SIGNAL_MESSAGE_TYPE.OUTBOUND_TAP:
      return (
        <FeedContent
          title={
            <>
              {"Tapped by "} <u>{name}</u>
            </>
          }
          icon={<CircleCard icon="person" />}
          description={date}
        />
      );
    case JUB_SIGNAL_MESSAGE_TYPE.INBOUND_TAP:
      return (
        <Link href={`/users/${id}`}>
          <FeedContent
            title={
              <>
                {"You tapped "} <u>{name}</u>
              </>
            }
            icon={<CircleCard icon="person" />}
            description={date}
          />
        </Link>
      );
    case JUB_SIGNAL_MESSAGE_TYPE.LOCATION_TAP:
      return (
        <Link href={`/locations/${id}`}>
          <FeedContent
            title={
              <>
                {"Attended talk "} <u>{name}</u>
              </>
            }
            icon={<CircleCard icon="location" />}
            description={date}
          />
        </Link>
      );
    case JUB_SIGNAL_MESSAGE_TYPE.QUEST_COMPLETED:
      return (
        <Link href={`/quests/${id}`}>
          <FeedContent
            icon={<CircleCard icon="proof" />}
            title={
              <>
                {"Made a proof "} <u>{name}</u>
              </>
            }
            description={date}
          />
        </Link>
      );
    case JUB_SIGNAL_MESSAGE_TYPE.ITEM_REDEEMED:
      return (
        <FeedContent
          title={
            <>
              {"Redeemed "} <u>{name}</u>
            </>
          }
          description={date}
          icon={<Icons.store />}
        />
      );
    default:
      return null;
  }
};

export default function Social() {
  const router = useRouter();
  const { getState } = useStateMachine({ updateStateFromAction });
  const { pageWidth } = useSettings();
  const [showSnapshotModal, setShowSnapshotModal] = useState(false);
  const [profile, setProfile] = useState<Profile>();
  const [numConnections, setNumConnections] = useState<number>(0);
  const [tabsItems, setTabsItems] = useState<TabsProps["items"]>();
  const [isLoading, setLoading] = useState(false);

  const isMenuOpen = getState().isMenuOpen ?? false;

  // Helper function to compute data needed to populate tabs
  const computeTabsItems = (
    profileData: Profile,
    users: Record<string, User>,
    activities: Activity[]
  ): TabsProps["items"] => {
    // Group activities by date
    const groupedActivities: Activity[][] = [];
    let currentDate: string | undefined = undefined;
    let currentDateActivities: Activity[] = [];
    activities.forEach((activity) => {
      const date = new Date(activity.ts).toDateString();
      if (currentDate === undefined) {
        currentDateActivities.push(activity);
        currentDate = date;
      } else if (currentDate === date) {
        currentDateActivities.push(activity);
      } else {
        groupedActivities.push(currentDateActivities);
        currentDateActivities = [activity];
        currentDate = date;
      }
    });
    groupedActivities.push(currentDateActivities);

    // Sort contacts by name then group by first letter
    const usersList = Object.entries(users).map(([key, value]) => ({
      ...value,
      uuid: key,
    }));
    const contactUsersList = usersList.filter((user) => user.outTs);
    const sortedContactUsers = contactUsersList.sort((a, b) => {
      return a.name.localeCompare(b.name, "en", { sensitivity: "base" }); // Ignore case
    });
    const groupedContactUsers: (User & { uuid: string })[][] = []; // User with uuid property included
    let currentLetter: string | undefined = undefined;
    let currentLetterUsers: (User & { uuid: string })[] = [];
    sortedContactUsers.forEach((user) => {
      const letter = user.name[0].toUpperCase();
      if (currentLetter === undefined) {
        currentLetterUsers.push(user);
        currentLetter = letter;
      } else if (currentLetter === letter) {
        currentLetterUsers.push(user);
      } else {
        groupedContactUsers.push(currentLetterUsers);
        currentLetterUsers = [user];
        currentLetter = letter;
      }
    });
    groupedContactUsers.push(currentLetterUsers);

    // Sort pending contacts by timestamp
    const pendingUsersList = usersList.filter(
      (user) =>
        user.inTs &&
        !user.outTs &&
        user.encPk !== profileData.encryptionPublicKey
    );
    const sortedPendingUserList = pendingUsersList.sort(
      (a, b) => new Date(b.inTs!).getTime() - new Date(a.inTs!).getTime()
    );

    return [
      {
        label: "Activity Feed",
        children: (
          <div className="flex flex-col gap-4">
            {activities.length === 0 && (
              <div className="flex justify-center items-center h-40">
                <span className="text-gray-10">No activities yet</span>
              </div>
            )}
            {activities.length !== 0 &&
              groupedActivities.map((activities, index) => {
                return (
                  <ListLayout
                    key={index}
                    label={new Date(activities[0].ts).toDateString()}
                  >
                    {activities.map((activity, index) => {
                      return (
                        <ActivityFeed
                          key={index}
                          type={activity.type}
                          name={activity.name}
                          id={activity.id}
                          date={formatDate(activity.ts)}
                        />
                      );
                    })}
                  </ListLayout>
                );
              })}
          </div>
        ),
      },
      {
        label: "Contacts",
        children: (
          <div className="flex flex-col gap-5">
            {contactUsersList.length === 0 && (
              <div className="flex justify-center items-center h-40">
                <span className="text-gray-10">
                  {"No people you've tapped"}
                </span>
              </div>
            )}
            {contactUsersList.length !== 0 &&
              groupedContactUsers.map((users, index) => {
                const groupLetter = users[0].name[0].toUpperCase();

                return (
                  <ListLayout key={index} label={groupLetter}>
                    <div className="flex flex-col gap-1">
                      {users.map((user, index) => {
                        const { name, outTs } = user;
                        const date = outTs ? formatDate(outTs) : "-";

                        return (
                          <ContactCard
                            key={index}
                            name={name}
                            userId={user.uuid}
                            date={date}
                          />
                        );
                      })}
                    </div>
                  </ListLayout>
                );
              })}
          </div>
        ),
      },
      {
        label: "Pending",
        badge: sortedPendingUserList.length > 0,
        children: (
          <div className="flex flex-col gap-5">
            {sortedPendingUserList.length === 0 && (
              <div className="flex justify-center items-center h-40">
                <span className="text-gray-10">
                  {"No people you haven't tapped back"}
                </span>
              </div>
            )}
            {sortedPendingUserList.length !== 0 && (
              <div className="flex flex-col gap-1">
                {sortedPendingUserList.map((user, index) => {
                  const { name, inTs } = user;
                  const date = inTs ? formatDate(inTs) : "-";

                  return (
                    <PendingContactCard
                      key={index}
                      name={name}
                      userId={user.uuid}
                      date={date}
                    />
                  );
                })}
              </div>
            )}
          </div>
        ),
      },
    ];
  };

  useEffect(() => {
    const updateSocialInfo = async () => {
      setLoading(true);

      const profileData = getProfile();
      const keyData = getKeys();
      const authToken = getAuthToken();
      if (
        !profileData ||
        !keyData ||
        !authToken ||
        authToken.expiresAt < new Date()
      ) {
        setLoading(false);
        router.push("/login");
        return;
      }

      // User is logged in, set profile
      setProfile(profileData);

      // If page is reloaded, load messages
      const navigationEntries = window.performance.getEntriesByType(
        "navigation"
      ) as PerformanceNavigationTiming[];
      if (navigationEntries.length > 0) {
        const navigationEntry = navigationEntries[0];
        if (navigationEntry.type && navigationEntry.type === "reload") {
          try {
            await loadMessages({ forceRefresh: false });
          } catch (error) {
            console.error("Failed to load messages upon page reload:", error);
          }
        }
      }

      // Compute tabs items
      const users = getUsers();
      const activities = getActivities();
      setNumConnections(
        Object.values(users).filter((user) => user.outTs).length
      );
      setTabsItems(computeTabsItems(profileData, users, activities));
      setLoading(false);
    };

    updateSocialInfo();
  }, [router]);

  if (isLoading) {
    return (
      <div className="my-auto mx-auto">
        <Spinner />
      </div>
    );
  }

  if (!profile || !tabsItems) return null;
  return (
    <>
      <SnapshotModal
        isOpen={showSnapshotModal}
        setIsOpen={setShowSnapshotModal}
        size={pageWidth - 60}
      />
      <div className="flex flex-col pt-4">
        <div className="flex gap-6 mb-6">
          <div
            onClick={() => {
              setShowSnapshotModal(true);
            }}
            className="size-32 rounded-[4px] relative overflow-hidden"
          >
            <ArtworkSnapshot
              width={128}
              height={128}
              isVisible={!showSnapshotModal && !isMenuOpen}
              pubKey={profile.signaturePublicKey}
            />
            <button type="button" className="absolute right-1 top-1 z-1">
              <Icons.zoom />
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1 mt-2">
              <div className="flex gap-[6px] items-center">
                <h2 className="text-xl font-gray-12 font-light">
                  {profile?.displayName}
                </h2>
              </div>
              <span className="text-sm font-light text-gray-10">
                {numConnections === 1
                  ? `1 tap given`
                  : `${numConnections} taps given`}
              </span>
            </div>
            <Link href="/leaderboard">
              <Button size="sm">View leaderboard</Button>
            </Link>
          </div>
        </div>
      </div>
      <Tabs items={tabsItems} />
    </>
  );
}
