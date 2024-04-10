import { useRouter } from "next/router";
import { Button } from "@/components/Button";
import { AppBackHeader } from "@/components/AppHeader";
import { toast } from "sonner";
import { QRCodeResponseType } from "../api/qr";
import { useEffect, useState } from "react";
import { getAuthToken, getKeys } from "@/lib/client/localStorage";
import { Spinner } from "@/components/Spinner";
import useRequireAdmin from "@/hooks/useRequireAdmin";
import { Icons } from "@/components/Icons";
import { ArtworkSnapshot } from "@/components/artwork/ArtworkSnapshot";
import Link from "next/link";

enum QRPageDisplayState {
  DISPLAY,
  SUCCESS,
  FAILURE,
}

const QRPageDisplayStateText: Record<QRPageDisplayState, string> = {
  [QRPageDisplayState.DISPLAY]: "Nullify proof",
  [QRPageDisplayState.SUCCESS]: "Proof nullification succeeded!",
  [QRPageDisplayState.FAILURE]: "Proof nullification failed.",
};

export type QRCodeData = {
  id: string;
  questName: string;
  questDescription: string;
  userDisplayName: string;
  signaturePublicKey: string;
  serializedProof: string;
};

const QRPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const [displayState, setDisplayState] = useState<QRPageDisplayState>(
    QRPageDisplayState.DISPLAY
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [qrCodeData, setQRCodeData] = useState<QRCodeData>();

  useEffect(() => {
    if (typeof id !== "string") {
      toast.error("Invalid QR code");
      router.push("/");
    }

    const fetchQR = async () => {
      const response = await fetch(`/api/qr?id=${id}`);
      if (!response.ok) {
        toast.error("Invalid QR code");
        router.push("/");
        return;
      }

      const qrData: QRCodeResponseType = await response.json();

      setQRCodeData({
        id: qrData.id,
        questName: qrData.quest.name,
        userDisplayName: qrData.user.displayName,
        signaturePublicKey: qrData.user.signaturePublicKey,
        questDescription: qrData.quest.description,
        serializedProof: qrData.serializedProof,
      });
    };
    fetchQR();
  }, [router, id]);

  const handleRedeem = async () => {
    setLoading(true);
    if (!qrCodeData) {
      toast.error("Must have a valid QR Code to redeem!");
      return;
    }

    const authToken = getAuthToken();
    const keys = getKeys();

    if (!authToken || authToken.expiresAt < new Date() || !keys) {
      toast.error("You must be logged in to nullify this proof");
      router.push("/login");
      return;
    }

    const response = await fetch(`/api/qr/redeem`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token: authToken.value, id: qrCodeData.id }),
    });
    if (!response.ok) {
      const { error } = await response.json();
      toast.error("Error nullifying proof");
      console.error("Error nullifying proof: ", error);
      setLoading(false);
      return;
    }

    const { success } = await response.json();
    if (success) {
      toast.success("Successfully nullified proof for user!");
      setDisplayState(QRPageDisplayState.SUCCESS);
    } else {
      toast.error("This proof has already been used.");
      setDisplayState(QRPageDisplayState.FAILURE);
    }
    setLoading(false);
  };

  if (!qrCodeData) {
    return (
      <div className="my-auto mx-auto">
        <Spinner label="Proof data is loading." />
      </div>
    );
  }

  return (
    <div className="mx-auto" style={{ maxWidth: "320px" }}>
      <Link href="https://cursive.team">
        <div className="flex justify-center my-4 text-primary">
          <Icons.Cursive />
        </div>
      </Link>
      <div className="mx-auto text-center">
        <div className="mx-auto size-32 rounded-[4px] relative overflow-hidden">
          <ArtworkSnapshot
            width={128}
            height={128}
            pubKey={qrCodeData.signaturePublicKey}
            background={""}
            homePage={false}
          />
        </div>
        <span className="text-[32px] text-primary font-normal">
          {qrCodeData.userDisplayName}
        </span>
        <div className="flex flex-col gap-4 mx-4 mt-6 text-center border-[2px] border-primary p-4 bg-teritiary">
          <span className="text-teritiary text-[18px] font-bold">
            {qrCodeData.questName}
          </span>
          <span className="font-weight-400 text-[14px] font-normal">
            {qrCodeData.questDescription}
          </span>
          <div className="flex flex-row gap-2 justify-center align-center text-primary">
            <Icons.CheckCircle />
            <span className="text-[14px] font-bold">Valid proof</span>
          </div>
        </div>
        <div
          className="flex flex-col gap-4 mt-6 mx-16 p-2 bg-primary rounded"
          onClick={() => {
            navigator.clipboard.writeText(qrCodeData.serializedProof);
            toast.success("Proof copied to clipboard");
          }}
        >
          <div className="flex flex-row gap-2 justify-center align-center">
            <span className="text-[14px] font-bold text-white">Copy proof</span>
          </div>
        </div>
        <div className="flex flex-col gap-4 mt-4 mx-16 p-2 border border-primary bg-teritiary rounded">
          <Link
            href="https://github.com/cursive-team/zk-summit/blob/5a97066c0c09ee7d2d388def1bec7b5547382c48/src/pages/api/quest/submit_proof.tsx#L50"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="flex flex-row gap-2 justify-center align-center">
              <span className="text-[14px] font-normal text-primary">
                View verification code
              </span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

QRPage.getInitialProps = () => {
  return { showFooter: false, showHeader: false };
};

export default QRPage;
