import { useScripts } from "@/hooks/useScripts";
import {
  PubKeyArrayElement,
  createFlower,
  generateSpiralPattern,
  getArtSignatures,
  makeGarden,
} from "@/lib/client/flower";
import { useEffect, useState } from "react";

export interface ArtworkSnapshotProps
  extends React.HTMLAttributes<HTMLCanvasElement> {
  width?: number;
  height?: number;
  pubKey?: string;
  title?: string;
  homePage?: boolean;
}

const ArtworkSnapshot = ({
  width,
  height,
  pubKey,
  title,
  homePage = false,
  ...props
}: ArtworkSnapshotProps) => {
  const isLoaded = useScripts();
  const [signatures, setSignatures] = useState<PubKeyArrayElement[]>();
  const [spiral, setSpiral] = useState<number[][]>();

  useEffect(() => {
    const combined = getArtSignatures();
    setSpiral(generateSpiralPattern(combined.length));
    setSignatures(combined);
  }, []);

  useEffect(() => {
    if (!isLoaded || !height) return;

    const stage = new window.createjs.Stage(
      document.getElementById("profile-pic")
    );

    if (!homePage && pubKey && pubKey !== "") {
      const center_x = stage.canvas.width / 2;
      const center_y = stage.canvas.height / 2;
      createFlower(stage, pubKey, center_x, center_y, height / 4);
    } else if (homePage && signatures && spiral) {
      makeGarden(stage, signatures, spiral, height, signatures.length);
    }
  }, [height, isLoaded, pubKey, homePage, signatures, spiral]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 bg-white/40 rounded-[8px]">
        <canvas
          className="artwork-webgl flex p-0 m-0 rounded-[8px]"
          id="profile-pic"
          height={height}
          width={width}
        ></canvas>
      </div>
    </div>
  );
};

ArtworkSnapshot.displayName = "ArtworkSnapshot";

export { ArtworkSnapshot };
