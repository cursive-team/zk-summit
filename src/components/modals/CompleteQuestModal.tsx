import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { Modal, ModalProps } from "./Modal";
import { Button } from "../Button";
import { classed } from "@tw-classed/react";
import { QuestWithRequirements } from "@/types";
import {
  QuestProvingStateUpdate,
  generateProofForQuest,
} from "@/lib/client/proving";
import { getAuthToken, getKeys, getProfile } from "@/lib/client/localStorage";
import { toast } from "sonner";
import { useRouter } from "next/router";
import { encryptQuestCompletedMessage } from "@/lib/client/jubSignal";
import { loadMessages } from "@/lib/client/jubSignalClient";
import { Card } from "../cards/Card";
import { Icons } from "../Icons";
import Link from "next/link";
import { logClientEvent } from "@/lib/client/metrics";

const QRCodeWrapper = classed.div("bg-white max-w-[254px]");

interface CompleteQuestModalProps extends ModalProps {
  quest: QuestWithRequirements & { isCompleted: boolean };
  existingProofId?: string;
}

enum CompleteQuestDisplayState {
  INITIAL,
  PROVING,
  COMPLETED,
}

type QuestProvingState = {
  numRequirementsTotal: number;
  numRequirementsProven: number;
  currentRequirementNumSigsTotal: number;
  currentRequirementNumSigsProven: number;
};

const CompleteQuestModal = ({
  quest,
  isOpen,
  setIsOpen,
  existingProofId,
}: CompleteQuestModalProps) => {
  const router = useRouter();
  const [displayState, setDisplayState] = useState<CompleteQuestDisplayState>(
    CompleteQuestDisplayState.INITIAL
  );
  const [provingState, setProvingState] = useState<QuestProvingState>({
    numRequirementsTotal: 0,
    numRequirementsProven: 0,
    currentRequirementNumSigsTotal: 0,
    currentRequirementNumSigsProven: 0,
  });
  const [proofId, setProofId] = useState<string>();

  useEffect(() => {
    if (existingProofId) {
      setProofId(existingProofId);
      setDisplayState(CompleteQuestDisplayState.COMPLETED);
    } else if (quest?.isCompleted) {
      setDisplayState(CompleteQuestDisplayState.COMPLETED);
    }
  }, [existingProofId, quest?.isCompleted]);

  const handleCompleteQuest = async () => {
    logClientEvent("questBeginGenerateProof", {});
    const authToken = getAuthToken();
    const profile = getProfile();
    const keys = getKeys();

    if (!authToken || authToken.expiresAt < new Date() || !profile || !keys) {
      toast.error("You must be logged in to generate a proof");
      router.push("/login");
      return;
    }

    setDisplayState(CompleteQuestDisplayState.PROVING);

    const onUpdateProvingState = (
      provingStateUpdate: QuestProvingStateUpdate
    ) => {
      setProvingState((prevProvingState) => {
        const newProvingState = { ...prevProvingState };
        if (provingStateUpdate.numRequirementsUpdate) {
          newProvingState.numRequirementsTotal =
            provingStateUpdate.numRequirementsUpdate.numRequirementsTotal;
          newProvingState.numRequirementsProven =
            provingStateUpdate.numRequirementsUpdate.numRequirementsProven;
        }
        if (provingStateUpdate.currentRequirementUpdate) {
          newProvingState.currentRequirementNumSigsTotal =
            provingStateUpdate.currentRequirementUpdate.currentRequirementNumSigsTotal;
          newProvingState.currentRequirementNumSigsProven =
            provingStateUpdate.currentRequirementUpdate.currentRequirementNumSigsProven;
        }

        return newProvingState;
      });
    };

    const serializedProof = await generateProofForQuest(
      quest,
      onUpdateProvingState
    );

    const response = await fetch("/api/quest/submit_proof", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        questId: quest.id.toString(),
        authToken: authToken.value,
        serializedProof,
      }),
    });

    if (!response.ok) {
      toast.error("Failed to submit proof!");
      setDisplayState(CompleteQuestDisplayState.INITIAL);
      return;
    }

    const data = await response.json();
    if (!data.verified) {
      toast.error("Proof failed to verify!");
      setDisplayState(CompleteQuestDisplayState.INITIAL);
      return;
    }

    const proofId = data.proofId;
    if (!proofId) {
      toast.error("Failed to submit proof!");
      setDisplayState(CompleteQuestDisplayState.INITIAL);
      return;
    }

    const senderPrivateKey = keys.encryptionPrivateKey;
    const recipientPublicKey = profile.encryptionPublicKey;
    const encryptedMessage = await encryptQuestCompletedMessage({
      questId: quest.id.toString(),
      questName: quest.name,
      proofId,
      senderPrivateKey,
      recipientPublicKey,
    });

    // Send quest completed info as encrypted jubSignal message to self
    // Simultaneously refresh activity feed
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
      console.error(
        "Error sending encrypted quest completed info to server: ",
        error
      );
      toast.error(
        "An error occured while generating the proof. Please try again."
      );
      setDisplayState(CompleteQuestDisplayState.INITIAL);
      return;
    }

    setProofId(proofId);
    setDisplayState(CompleteQuestDisplayState.COMPLETED);
  };

  const ContentHeader = () => {
    return (
      <div className="flex flex-col gap-1 self-center">
        <div className="flex flex-col gap-2">
          <span className="text-iron-600 text-sm font-bold">
            Requirements met!
          </span>
          <span className="text-xl font-medium text-iron-950">
            {quest.name}
          </span>
        </div>
      </div>
    );
  };

  const percentageComplete =
    (provingState.currentRequirementNumSigsProven /
      provingState.currentRequirementNumSigsTotal) *
    100;

  const qrCodeUrl = `${window.location.origin}/qr/${proofId}`;

  const copyProofLink = async () => {
    await navigator.clipboard.writeText(qrCodeUrl);
    toast.success("Proof link copied to clipboard!");
  };

  const twitterShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    `I am a verified ${quest.name} at zkSummit11. Here's my ZK proof:`
  )}&url=${encodeURIComponent(qrCodeUrl)}`;

  const getModalContent = (): JSX.Element => {
    switch (displayState) {
      case CompleteQuestDisplayState.INITIAL:
        return (
          <div className="flex flex-col w-full justify-center items-center text-center gap-5 h-full px-16">
            <ContentHeader />
            <div className="self-center w-full">
              <Button onClick={handleCompleteQuest}>Generate Proof</Button>
            </div>
          </div>
        );
      case CompleteQuestDisplayState.PROVING:
        return (
          <div className="flex flex-col w-full justify-center text-center gap-5 h-full px-16">
            <div className="flex flex-col gap-6">
              <ContentHeader />
              <div className="flex flex-col gap-2">
                <span className="text-iron-950 text-xs text-center">
                  {provingState.currentRequirementNumSigsProven ===
                  provingState.currentRequirementNumSigsTotal
                    ? "Submitting proof for verification..."
                    : `Generating ZK proof (${provingState.currentRequirementNumSigsProven}/${provingState.currentRequirementNumSigsTotal} reqs)`}
                </span>
                <div className="relative">
                  <Card.Progress
                    style={{
                      width: `${percentageComplete}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      case CompleteQuestDisplayState.COMPLETED:
        const qrCodeData = `${window.location.origin}/qr/${proofId}`;
        return (
          <div className="flex flex-col w-full justify-center text-center gap-5 h-full px-16">
            <div className="flex flex-col gap-6 self-center">
              <div className="flex flex-col gap-1">
                <span className="text-sm text-iron-600 font-bold">Proof:</span>
                <span className="text-[21px] font-sans text-iron-950 font-medium">
                  {quest.name}
                </span>
              </div>
              <QRCodeWrapper>
                <QRCode
                  size={156}
                  className="ml-auto p-4 h-auto w-full max-w-full"
                  value={qrCodeData}
                  viewBox={`0 0 156 156`}
                />
                <span className="block text-xs px-10 pb-3 text-iron-950 text-center leading-[16px] break-all">
                  Anyone can scan this QR code to verify your proof
                </span>
              </QRCodeWrapper>
              <Button onClick={copyProofLink}>Copy link to proof</Button>
              <Link href={twitterShareUrl} target="_blank">
                <Button
                  variant="transparent"
                  icon={<Icons.Twitter className="text-primary mr-2" />}
                >
                  Share on Twitter
                </Button>
              </Link>
            </div>
          </div>
        );
      default:
        return <></>;
    }
  };

  return (
    <Modal isOpen={isOpen} setIsOpen={setIsOpen} withBackButton>
      {getModalContent()}
    </Modal>
  );
};

CompleteQuestModal.displayName = "CompleteQuestModal";
export { CompleteQuestModal };
