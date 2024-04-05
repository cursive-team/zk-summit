import { Icons } from "@/components/Icons";
import { classed } from "@tw-classed/react";
import Link from "next/link";
import { useRouter } from "next/router";
import { ReactNode, useState } from "react";
import { deleteAccountFromLocalStorage } from "@/lib/client/localStorage";
import Profile from "./Profile";
import { useStateMachine } from "little-state-machine";
import updateStateFromAction from "@/lib/shared/updateAction";
import { ProfileDisplayState } from "@/types";
import { supabase } from "@/lib/client/realtime";

const Title = classed.h3("block text-base text-iron-950 font-medium leading-5");
const Subtitle = classed.h4("text-sm text-iron-950 leading-5");
const Description = classed.span("text-sm text-iron-950 leading-5");

const ContentWrapper = classed.div("flex flex-col gap-3 mt-3 xs:gap-4 xs:mt-6");

interface AppHeaderContentProps {
  isMenuOpen: boolean;
  setIsMenuOpen: (value: boolean) => void;
  handleSignout: () => void;
}

interface AppBackHeaderProps {
  redirectTo?: string; // redirect to this page instead of back
  onBackClick?: () => void;
  actions?: ReactNode;
  label?: string;
}

export const AppBackHeader = ({
  redirectTo,
  onBackClick,
  actions,
  label,
}: AppBackHeaderProps) => {
  const router = useRouter();

  return (
    <div className="flex justify-between items-center h-[50px] xs:h-[60px]">
      <button
        type="button"
        className="flex items-center gap-1 text-iron-950"
        onClick={() => {
          if (typeof onBackClick === "function") {
            onBackClick?.();
          } else {
            if (redirectTo) {
              router.push(redirectTo);
            } else {
              router.back();
            }
          }
        }}
      >
        <Icons.ArrowLeft />
        <span className="text-sm font-normal text-iron-950">
          {label || "Back"}
        </span>
      </button>
      {actions}
    </div>
  );
};

const AppHeaderContent = ({
  isMenuOpen,
  setIsMenuOpen,
  handleSignout,
}: AppHeaderContentProps) => {
  const { actions, getState } = useStateMachine({ updateStateFromAction });
  const [activeMenuIndex, setActiveMenuIndex] = useState<number | null>(null);

  const profileViewState: ProfileDisplayState =
    getState().profileView || ProfileDisplayState.VIEW;

  if (!isMenuOpen) return null;

  const MenuItems: { label: string; children: ReactNode }[] = [
    {
      label: "Profile & settings",
      children: <Profile handleSignout={handleSignout} />,
    },
    {
      label: "Information & FAQ's",
      children: (
        <>
          <ContentWrapper>
            <Title>Information</Title>
            <Description>
              BUIDLQuest is a way for ETHDenver attendees to connect with each
              other and unlock unique experiences and merch by tapping NFC
              chips. You collect unique stamps and signatures from tapping
              people’s chipped badges to prove you met them, or from tapping
              chips around the venue to prove you’ve been to in-person events.
            </Description>
            <Description>
              If you satisfy the tap requirements of a quest, you can generate a
              ZK proof of completion to earn $BUIDL to buy items at the BUIDL
              Store! The store is at the front of the ETHDenver venue, full of
              some of the best IYK chipped goods, claimed
              first-come-first-serve!
            </Description>
          </ContentWrapper>
          <ContentWrapper>
            <Title>FAQ</Title>
            <div className="flex flex-col gap-2">
              <Subtitle>Who is behind BUIDLQuest?</Subtitle>
              <Description>
                BUIDLQuest is a joint collaboration between{" "}
                <u>
                  <a
                    href="https://zksync.io/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    ZKSync
                  </a>
                </u>
                ,{" "}
                <u>
                  <a
                    href="https://iyk.app"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    IYK
                  </a>
                </u>
                ,{" "}
                <u>
                  <a
                    href="https://cursive.team"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Cursive
                  </a>
                </u>
                , ,{" "}
                <u>
                  <a
                    href="https://getclave.io/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Clave
                  </a>
                </u>
                ,{" "}
                <u>
                  <a
                    href="https://summon.xyz/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Summon
                  </a>
                </u>
                , and{" "}
                <u>
                  <a
                    href="https://ethdenver.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    ETHDenver
                  </a>
                </u>
                .
              </Description>
            </div>
            <div className="flex flex-col gap-2">
              <Subtitle>What do I get from participating?</Subtitle>
              <Description>
                IYK has set up an expansive merch store at the front of the main
                venue, filled with chipped goods that you can claim for $BUIDL
                earned from completing quests!
              </Description>
            </div>
            <div className="flex flex-col gap-2">
              <Subtitle>{"Where do I get support?"}</Subtitle>
              <Description>
                Join this Cursive ETHDenver{" "}
                <a
                  href="https://t.me/+pggQrl-a0W1mZGQ5"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <u>Telegram group</u>
                </a>{" "}
                for technical support and questions!
              </Description>
            </div>
          </ContentWrapper>
          <ContentWrapper className="pb-20">
            <Title>Project Links</Title>
            <div className="flex flex-col gap-2">
              <Subtitle>
                GitHub:{" "}
                <u>
                  <a
                    href="https://github.com/cursive-team/nfc-denver"
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    https://github.com/cursive-team/nfc-denver
                  </a>
                </u>
              </Subtitle>
            </div>
          </ContentWrapper>
        </>
      ),
    },
  ];

  const onBack = () => {
    if (
      profileViewState === ProfileDisplayState.CHOOSE_PASSWORD ||
      profileViewState === ProfileDisplayState.INPUT_PASSWORD
    ) {
      actions.updateStateFromAction({
        ...getState(),
        profileView: ProfileDisplayState.VIEW,
      });
      return; //
    }

    if (profileViewState === ProfileDisplayState.EDIT) {
      actions.updateStateFromAction({
        ...getState(),
        profileView: ProfileDisplayState.VIEW,
      });
    }

    setActiveMenuIndex(null);
  };

  const showBackButton = activeMenuIndex !== null;

  return (
    <div className="fixed inset-0 w-full overflow-auto px-3 xs:px-4 z-10 h-full bg-main">
      <div className="flex h-[40px] xs:h-[60px]">
        {showBackButton && (
          <button
            onClick={onBack}
            type="button"
            className="flex gap-2 items-center text-iron-950"
          >
            <Icons.ArrowLeft />
            <span>Back</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setIsMenuOpen(!isMenuOpen);
            // reset profile view
            actions.updateStateFromAction({
              ...getState(),
              profileView: ProfileDisplayState.VIEW,
            });
            // reset active menu
            setActiveMenuIndex(null);
          }}
          className="flex gap-3 items-center ml-auto text-iron-950"
        >
          <span>Close</span>
          {isMenuOpen ? <Icons.Close /> : <Icons.Burgher />}
        </button>
      </div>
      <div className="mt-2">
        <div className="flex flex-col gap-6">
          {MenuItems.map((item, index) => {
            if (activeMenuIndex !== null) return null;
            return (
              <Title
                key={item.label}
                onClick={() => {
                  setActiveMenuIndex(index);
                }}
              >
                {item.label}
              </Title>
            );
          })}
        </div>

        {activeMenuIndex !== null && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              {MenuItems[activeMenuIndex].children}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface AppHeaderProps {
  isMenuOpen: boolean;
  setIsMenuOpen: (value: boolean) => void;
}
const AppHeader = ({ isMenuOpen, setIsMenuOpen }: AppHeaderProps) => {
  const { actions, getState } = useStateMachine({ updateStateFromAction });
  const handleSignout = async () => {
    deleteAccountFromLocalStorage();
    supabase.auth.signOut();
    window.location.href = "/";
  };

  const toggleMenu = () => {
    const newState = !isMenuOpen;
    // update state for menu
    actions.updateStateFromAction({
      ...getState(),
      isMenuOpen: newState,
    });
    setIsMenuOpen(newState);
  };

  return (
    <div className="flex w-full items-center p-3 py-3 xs:p-4 bg-main z-50">
      {!isMenuOpen && (
        <Link href="/">
          <button type="button" className="flex gap-2 items-center">
            <Icons.Cursive />
          </button>
        </Link>
      )}

      <div className="flex gap-4 items-center ml-auto">
        <span className="text-primary">{isMenuOpen && "Close"}</span>
        <button className="text-iron-950" onClick={toggleMenu}>
          {isMenuOpen ? (
            <Icons.Close className="text-primary" />
          ) : (
            <Icons.Burgher className="text-primary" />
          )}
        </button>
      </div>

      <AppHeaderContent
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        handleSignout={handleSignout}
      />
    </div>
  );
};

AppHeader.displayName = "AppHeader";

export { AppHeader };
