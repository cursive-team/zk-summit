import { useScripts } from "@/hooks/useScripts";
import {
  getLocationSignatures,
  getProfile,
  getUsers,
} from "@/lib/client/localStorage";
import { classed } from "@tw-classed/react";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { Card } from "../cards/Card";
import { cn } from "@/lib/client/utils";

const Label = classed.span("text-gray-10 text-xs font-normal");
const Description = classed.span(
  "text-center text-gray-12 text-sm font-normal"
);

export interface ArtworkSnapshotProps
  extends React.HTMLAttributes<HTMLCanvasElement> {
  width?: number;
  height?: number;
  pubKey?: string;
  slider?: boolean;
  isVisible?: boolean;
  title?: string;
}

type PubKeyArrayElement = {
  pubKey: string;
  timestamp: number;
  name: string;
  person: boolean;
};

interface ProfileCardArtworkProps {
  size?: number;
  image?: string;
}

const ProfileCardArtwork = ({ size, image }: ProfileCardArtworkProps) => {
  return (
    <Card.Artwork
      className={cn("p-2 bg-[#ecf8ff]")}
      style={{
        backgroundImage: `url(${image})`,
        height: `${size}px`,
        width: `${size}px`,
      }}
    />
  );
};

type ArtworkWrapperProps = Pick<ArtworkSnapshotProps, "children" | "title">;
const ArtworkWrapper = ({ children, title }: ArtworkWrapperProps) => {
  return (
    <div className="flex flex-col gap-2">
      {children}
      {title && (
        <span className="text-xs text-gray-900 font-normal mx-auto">
          {title}
        </span>
      )}
    </div>
  );
};

const ArtworkSnapshot = ({
  width,
  height,
  pubKey,
  slider,
  isVisible = true,
  title,
  ...props
}: ArtworkSnapshotProps) => {
  const isLoaded = useScripts();
  const [rangeValue, setRangeValue] = useState<number>(1);
  const [signatures, setSignatures] = useState<PubKeyArrayElement[]>([]);
  const [dataURL, setDataURL] = useState<string>("");
  const firstRender = useRef(true);

  const HAS_PROFILE_PUB_KEY = !!pubKey;

  useEffect(() => {
    // define global variables for the artwork
    window.artworkWidth = width ?? 200;
    window.artworkHeight = height ?? 200;
  }, []);

  const renderRangeStep = (newIndex: number) => {
    setRangeValue(newIndex);
    window.params.upToPubKey = newIndex;
  };

  const onRangeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value);

    setRangeValue(newValue); // Update state on change

    renderRangeStep(newValue);
  };

  useEffect(() => {
    const profile = getProfile();
    const combined: PubKeyArrayElement[] = [];
    if (!pubKey) {
      const users = getUsers();
      for (const userKey in users) {
        const user = users[userKey];
        if (user.sigPk === profile?.signaturePublicKey) continue;
        const ts = user.inTs;
        const pk = user.sigPk;
        if (ts && pk) {
          combined.push({
            pubKey: pk,
            timestamp: new Date(ts).getTime(),
            name: user.name,
            person: true,
          });
        }
      }

      const locationSignatures = getLocationSignatures();
      for (const locationKey in locationSignatures) {
        const location = locationSignatures[locationKey];
        const ts = new Date(location.ts).getTime();
        const pk = location.pk;
        if (ts && pk) {
          combined.push({
            pubKey: pk,
            timestamp: ts,
            name: location.name,
            person: false,
          });
        }
      }

      combined.sort((a, b) => a.timestamp - b.timestamp);
      // add personal signature to the beginning of the array
      combined.unshift({
        pubKey: profile?.signaturePublicKey ?? "0",
        timestamp: new Date().getTime(),
        name: "You",
        person: true,
      });

      const signaturePublicKey = profile?.signaturePublicKey ?? "0";
      window.myPubKey = signaturePublicKey;
    } else {
      window.myPubKey = pubKey;
      combined.push({
        pubKey,
        timestamp: new Date().getTime(),
        name: "You",
        person: true,
      });
    }
    setSignatures(combined);
  }, [pubKey]);

  useEffect(() => {
    if (pubKey === "" || !isLoaded || signatures.length === 0) return;
    // prevent after first render
    if (!firstRender.current) return;

    window.params = {
      fill: false,
      stroke: true,
      abstract: false,
      upToPubKey: rangeValue,
    };

    window.signatures = signatures.map((s) => ({
      pubKey: s.pubKey,
      timestamp: s.timestamp,
    }));

    firstRender.current = false;

    if (HAS_PROFILE_PUB_KEY && !dataURL) {
      const dataURL = window.stamp(pubKey, width, height).getImage();
      setDataURL(dataURL);
    } else {
      window?.render(); // render the artwork
    }
  }, [
    height,
    isLoaded,
    width,
    pubKey,
    signatures,
    slider,
    rangeValue,
    HAS_PROFILE_PUB_KEY,
    dataURL,
  ]);

  // if profile public key is available, use the dataURL
  if (HAS_PROFILE_PUB_KEY || pubKey === "") {
    return (
      <ArtworkWrapper title={title}>
        <ProfileCardArtwork size={width ?? 200} image={dataURL} />
      </ArtworkWrapper>
    );
  }

  if (signatures?.length === 0) return;

  return (
    <div className="flex flex-col gap-4">
      {isVisible && (
        <ArtworkWrapper title={title}>
          <canvas
            className="artwork-webgl flex p-0 m-0 rounded-[8px]"
            id="artwork-webgl"
            {...props}
          ></canvas>
        </ArtworkWrapper>
      )}
      {slider && (
        <div className="flex flex-col gap-4 h-full">
          {signatures?.length > 1 && (
            <label className="flex flex-col gap-4 w-full">
              <div className="label p-0">
                <Label className="label-text">Start</Label>
                <Label className="label-text-alt">Present</Label>
              </div>
              <input
                type="range"
                min={1}
                max={signatures.length}
                value={rangeValue} // Bind the value to state
                onChange={onRangeChange}
                className="w-full h-0.5 bg-main accent-gray-12 appearance-none"
              />
            </label>
          )}
          <div className="relative flex flex-col gap-4">
            {signatures?.map(({ person, name, timestamp }, index) => {
              const showCurrent = rangeValue === index + 1;
              const isFirstElement = index === 0;

              return (
                <div
                  key={index}
                  className={cn(
                    "absolute inset-0 flex flex-col gap-1 w-full duration-200 ease-in",
                    {
                      "opacity-0": !showCurrent,
                      "opacity-100": showCurrent,
                    }
                  )}
                >
                  <Description>
                    {isFirstElement
                      ? "ETHDenver stamp collection NFT"
                      : `Collection when ${
                          person ? `you met ${name}` : `you went to ${name}`
                        }`}
                  </Description>
                  <Label className="text-center">
                    {isFirstElement && signatures.length > 1
                      ? "Starts with your personal stamp"
                      : new Date(timestamp).toLocaleString()}
                  </Label>
                  <Label className="text-center">
                    Art by{" "}
                    <a
                      href="https://twitter.com/stefan_contiero"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <u>Stefano Contiero</u>
                    </a>{" "}
                    +{" "}
                    <a
                      href="https://www.artblocks.io/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <u>ArtBlocks</u>
                    </a>
                  </Label>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

ArtworkSnapshot.displayName = "ArtworkSnapshot";

export { ArtworkSnapshot };
