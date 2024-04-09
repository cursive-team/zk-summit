import { ModalProps, Modal } from "./Modal";
import { ChangeEvent, useEffect, useState } from "react";
import { useScripts } from "@/hooks/useScripts";
import { classed } from "@tw-classed/react";
import { cn } from "@/lib/client/utils";
import {
  PubKeyArrayElement,
  generateSpiralPattern,
  getArtSignatures,
  makeGarden,
} from "@/lib/client/flower";

const Title = classed.span("text-center text-iron-950 text-[20px] font-bold");
const Label = classed.span("text-iron-600 text-xs font-normal");
const Description = classed.span(
  "text-center text-iron-700 text-sm font-regular"
);

interface SliderModalProps extends ModalProps {
  size?: number;
}

const SliderModal = ({ isOpen, setIsOpen, size = 320 }: SliderModalProps) => {
  const isLoaded = useScripts();
  const [signatures, setSignatures] = useState<PubKeyArrayElement[]>([]);
  const [spiral, setSpiral] = useState<number[][]>([]);
  const [rangeValue, setRangeValue] = useState<number>(1);

  const onRangeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value);
    setRangeValue(newValue);
  };

  useEffect(() => {
    const combined = getArtSignatures();
    setSpiral(generateSpiralPattern(combined.length));
    setSignatures(combined);
  }, []);

  useEffect(() => {
    if (!isLoaded || !signatures || !isOpen || !spiral) return;
    const stage = new window.createjs.Stage(document.getElementById("slider"));
    makeGarden(stage, signatures, spiral, size, rangeValue);
  }, [isLoaded, signatures, isOpen, rangeValue, size, spiral]);

  return (
    <Modal isOpen={isOpen} setIsOpen={setIsOpen} withBackButton>
      <div className="flex flex-col gap-10">
        <div className="flex flex-col gap-4">
          <div className="mx-auto">
            <div className="flex flex-col gap-4 h-full">
              <Title>Your ZK11 Flower Garden</Title>

              <div className="flex flex-col gap-2 bg-white/40 rounded-[8px]">
                <canvas
                  className="artwork-webgl flex p-0 m-0 rounded-[8px]"
                  id="slider"
                  height={size}
                  width={size}
                ></canvas>
              </div>
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
                    className="w-full h-2 bg-main accent-iron-950 cursor-pointer"
                    style={{ touchAction: "none" }}
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
                        {isFirstElement ? (
                          "Your personal pubkey flower"
                        ) : (
                          <>
                            {`Garden when ${
                              person ? `you met ` : `you attended `
                            }`}{" "}
                            <b>{name}</b>
                          </>
                        )}
                      </Description>
                      <div
                        className="text-center px-5"
                        style={{ lineHeight: 1 }}
                      >
                        <Label>
                          Taps produce a unique digital signature to prove{" "}
                          {person ? "meeting" : "attendance"}. The linked pubkey
                          is visualized as a generative art flower for your
                          garden.
                        </Label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

SliderModal.displayName = "SliderModal";
export { SliderModal };
