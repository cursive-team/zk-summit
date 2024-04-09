import { Card } from "@/components/cards/Card";
import { classed } from "@tw-classed/react";

const Title = classed.h1(
  "font-medium font-normal text-primary text-base text-center"
);
const Description = classed.div(
  Card.Base,
  "p-2 text-[14px] font-normal font-sans !border-none text-iron-950 !rounded-[8px]"
);

export default function Info() {
  return (
    <div className="h-full flex flex-col pt-4 pb-8 ">
      <div className="flex flex-col my-auto justify-center">
        <Title>
          <div className="flex items-center justify-center m-4 gap-2">
            Tap your ZK11 badge to get started!
          </div>
        </Title>
        <div className="flex flex-col gap-2 m-4">
          <Description>
            <span>
              Hold the card you got at registration against your phone until you
              receive a notification.
            </span>
          </Description>
          <Description>
            <span>
              <b>iPhones</b>: Hold card against the top of your phone and unlock
              the screen.
            </span>
          </Description>
          <Description>
            <span>
              <b>Android</b>: Unlock your phone and hold card against the center
              of your phone. Ensure NFC is turned on in your settings.
            </span>
          </Description>
          <Description>
            <span>
              Learn more about what you can do and the tech involved{" "}
              <a
                href="https://github.com/cursive-team/zk-summit"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary"
              >
                <u>here</u>
              </a>
              . Get more help with tapping{" "}
              <a
                href="https://cursive-team.notion.site/Card-tapping-help-ab032fa0b48540989737088c534e1aca?pvs=4"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary"
              >
                <u>here</u>
              </a>
              .
            </span>
          </Description>
        </div>
      </div>
    </div>
  );
}

Info.getInitialProps = () => {
  return { fullPage: true };
};
