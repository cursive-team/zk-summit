import { useRouter } from "next/router";
import { Button } from "@/components/Button";
import { AppBackHeader } from "@/components/AppHeader";
import { toast } from "sonner";
import { QRCodeResponseType } from "../api/qr";
import { useEffect, useState } from "react";
import { getAuthToken, getKeys } from "@/lib/client/localStorage";
import { Spinner } from "@/components/Spinner";
import useRequireAdmin from "@/hooks/useRequireAdmin";

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
  userDisplayName: string;
};

const QRPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const [displayState, setDisplayState] = useState<QRPageDisplayState>(
    QRPageDisplayState.DISPLAY
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [qrCodeData, setQRCodeData] = useState<QRCodeData>();

  useRequireAdmin();

  useEffect(() => {
    if (typeof id !== "string") {
      toast.error("Invalid QR code");
      router.push("/");
    }

    const authToken = getAuthToken();
    if (!authToken || authToken.expiresAt < new Date()) {
      toast.error("You must be logged in to view this page");
      router.push("/login");
      return;
    }

    const fetchQR = async () => {
      const response = await fetch(`/api/qr?id=${id}&token=${authToken.value}`);
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
        <Spinner label="QR code data is loading." />
      </div>
    );
  }

  return (
    <div>
      <AppBackHeader redirectTo="/" />
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 items-center">
          <div className="flex flex-col gap-0.5">
            <div className="flex flex-col text-center">
              <span className="text-xs font-normal text-gray-900">
                {qrCodeData.userDisplayName}
              </span>
              <h2 className="text-sm text-gray-12">{qrCodeData.questName}</h2>
            </div>
          </div>
          {displayState === QRPageDisplayState.SUCCESS && (
            <div className="flex flex-col gap-4 items-center">
              <span className="text-lg font-normal text-gray-900">
                {"Successfully nullified proof."}
              </span>
            </div>
          )}
          {displayState === QRPageDisplayState.FAILURE && (
            <div className="flex flex-col gap-4 items-center">
              <span className="text-lg font-normal text-gray-900">
                {"Failed to nullify proof."}
              </span>
            </div>
          )}
          <Button
            loading={loading}
            disabled={displayState !== QRPageDisplayState.DISPLAY}
            onClick={handleRedeem}
          >
            {QRPageDisplayStateText[displayState]}
          </Button>
        </div>
      </div>
    </div>
  );
};

QRPage.getInitialProps = () => {
  return { showFooter: false, showHeader: false };
};

export default QRPage;
