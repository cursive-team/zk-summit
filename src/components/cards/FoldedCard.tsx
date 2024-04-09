import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import { Swiper, SwiperSlide } from "swiper/react";
import { Controller, EffectFade, Pagination, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/effect-fade";
import "swiper/css/pagination";
import { classed } from "@tw-classed/react";
import { Card } from "./Card";
import { ReactNode, useEffect, useState } from "react";
import { cn } from "@/lib/client/utils";
import { Icons } from "../Icons";

dayjs.extend(duration);
const UNFOLDED_DATE = "2024-04-10 14:59:59";
const CountdownLabel = classed.span("text-primary font-semibold text-xs");

interface FoldedItemProps {
  image?: string;
  children?: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  description?: ReactNode;
}

interface FolderCardProps {
  items: FoldedItemProps[];
  onClose?: () => void;
}

export const FOLDED_MOCKS: FolderCardProps["items"] = [
  {
    image: "/bg-gradient-card.png",
    children: (
      <>
        <Icons.ZKFolded
          className="text-primary w-full"
          height={100}
          width={100}
        />
      </>
    ),
  },
  {
    subtitle: "We're so happy you joined us at ZK Summit 11!",
    description: "Ready to review your memories?",
  },
  {
    title: "ZK11 - a symposium for brilliant minds",
    description: "You connected with 21 other attendees",
  },
  {
    title: "32 speakers filled the academy for a full day of talks",
    description: "You attended 4 talks",
  },
];
const FoldedCardSteps = ({ items = [], onClose }: FolderCardProps) => {
  const [activeIndex, setActiveIndex] = useState(0);

  const pagination = {
    clickable: true,
    bulletActiveClass: "folded-dot-active",
    renderBullet: (index: number, className: string) => {
      return `<div data-index="${index}" class="my-2 folded-dot ${className}"></div>`;
    },
  };

  return (
    <main className="relative">
      <Icons.Cursive
        className="fixed top-[47px] left-[22px] text-primary z-10"
        height={19}
        width={63}
      />
      <div className="fixed flex items-center gap-8 right-[22px] top-[47px] z-10">
        <button
          aria-label="pause"
          type="button"
          className="size-[18x] rounded-full bg-white/60 p-1"
        >
          <Icons.ControllerPause className="text-iron-950" />
        </button>
        <button
          aria-label="close"
          type="button"
          className="size-[18x] rounded-full bg-white/60 p-1"
          onClick={() => onClose?.()}
        >
          <Icons.ControllerClose className="text-iron-950" />
        </button>
      </div>
      <Swiper
        pagination={pagination}
        modules={[EffectFade, Controller, Pagination, Autoplay]}
        effect="fade"
        autoplay={{
          delay: 3000,
        }}
        className="h-screen"
        spaceBetween={0}
        slidesPerView={1}
        onSlideChange={(el: any) => {
          setActiveIndex(el?.activeIndex ?? 0);
        }}
      >
        {items?.map(
          ({ title, subtitle, description, children, image }, itemIndex) => {
            return (
              <SwiperSlide
                key={itemIndex}
                className={cn(
                  "items-center justify-center h-screen flex",
                  !!image ? "bg-cover bg-center" : "bg-main"
                )}
                style={{
                  backgroundImage: image ? `url('${image}')` : undefined,
                  backgroundSize: image ? "cover" : undefined,
                }}
              >
                <div
                  className="flex flex-col gap-6 grow items-center justify-center px-10"
                  style={{
                    height: "100%",
                  }}
                >
                  {children}
                  {title && (
                    <h4 className="text-primary leading-[32px] font-medium font-sans text-3xl text-center">
                      {title}
                    </h4>
                  )}
                  {subtitle && (
                    <span className="text-primary font-bold font-sans text-lg text-center">
                      {subtitle}
                    </span>
                  )}
                  {description && (
                    <span className="text-primary font-normal font-sans text-base text-center">
                      {description}
                    </span>
                  )}
                </div>
              </SwiperSlide>
            );
          }
        )}
      </Swiper>
    </main>
  );
};

export const FolderCard = ({ items }: FolderCardProps) => {
  const [isOpened, setIsOpened] = useState(false);
  const [hasCountdown, setHasCountdown] = useState(false);
  const [countdown, setCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const isDatePassed = dayjs().isAfter(dayjs(UNFOLDED_DATE));
    setHasCountdown(!isDatePassed);

    if (isDatePassed) return;
    const interval = setInterval(() => {
      const targetDate = dayjs(UNFOLDED_DATE);
      const currentDate = dayjs();
      const duration = dayjs.duration(targetDate.diff(currentDate));
      const days = duration.days();
      const hours = duration.hours();
      const minutes = duration.minutes();
      const seconds = duration.seconds();

      setCountdown({ days, hours, minutes, seconds });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const { days, hours, minutes, seconds } = countdown;

  return (
    <div>
      <div
        className={cn(
          "fixed inset-0 bg-main duration-300",
          isOpened ? "z-[100] opacity-100" : "z-[-10] opacity-0",
          {}
        )}
      >
        <FoldedCardSteps
          items={items}
          onClose={() => {
            setIsOpened(false);
          }}
        />
      </div>
      <Card.Base
        aria-label="Folded Card"
        onClick={() => setIsOpened(!isOpened)}
        className={cn({
          "opacity-60 pointer-events-none": hasCountdown,
          "py-4": !hasCountdown,
        })}
        style={{
          backgroundImage: "url('/bg-glitter.png')",
        }}
      >
        <div className="flex flex-col gap-2 text-center pt-4 pb-4 px-6 ">
          {hasCountdown && (
            <CountdownLabel>
              Available in: {days === 1 ? `${days} day` : `${days} days`},{" "}
              {hours.toString().padStart(2, "0")}:
              {minutes.toString().padStart(2, "0")}:
              {seconds.toString().padStart(2, "0")}
            </CountdownLabel>
          )}
          <h3 className="font-bold font-sans text-[21px] text-black">
            ZK11 Folded
          </h3>
          <span className="text-xs text-iron-900">
            Using client-side Nova folding proofs, create and share a Spotify
            Wrapped-like summary of your zkSummit11!
          </span>
        </div>
      </Card.Base>
    </div>
  );
};
