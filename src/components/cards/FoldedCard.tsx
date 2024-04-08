"use client";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
dayjs.extend(duration);

import { classed } from "@tw-classed/react";
import { Card } from "./Card";
import { useEffect, useState } from "react";
import { cn } from "@/lib/client/utils";

const UNFOLDED_DATE = "2024-04-10 14:59:59";

const CountdownLabel = classed.span("text-primary font-semibold text-xs");

export const FolderCard = () => {
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
    <Card.Base
      className={cn({
        "opacity-60 pointer-events-none": hasCountdown,
      })}
      style={{
        backgroundImage: "url('/bg-glitter.png')",
      }}
    >
      <div className="flex flex-col gap-2 text-center pt-4 pb-4 px-6 ">
        {hasCountdown && (
          <CountdownLabel>
            Available in: {days} days, {hours}:{minutes}:{seconds}
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
  );
};
