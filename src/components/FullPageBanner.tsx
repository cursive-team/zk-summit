import { APP_CONFIG } from "@/shared/constants";
import { Icons } from "./Icons";
import { Card } from "./cards/Card";
import useSettings from "@/hooks/useSettings";
import { DM_Sans } from "next/font/google";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

interface FullPageBannerProps extends React.HTMLAttributes<HTMLDivElement> {
  description: string;
  title?: string;
  iconSize?: number;
}

const FullPageBanner = ({ description, title }: FullPageBannerProps) => {
  const { pageHeight } = useSettings();
  return (
    <div
      style={{
        minHeight: `${pageHeight}px`,
      }}
      className={`flex text-center h-full ${dmSans.variable} font-sans`}
    >
      <div className="flex flex-col gap-2 my-auto mx-auto px-10">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-4 mx-auto">
            <Icons.Cursive className="text-iron-950" height={80} width={120} />
          </div>
          <span className="text-[36px] font-bold font-sans text-center">
            {APP_CONFIG.APP_NAME}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {title && <Card.Title className="!text-lg">{title}</Card.Title>}
          <Card.Base className="p-2">
            <Card.Description>
              <span className="font-sans text-sm text-iron-950">
                {description}
              </span>
            </Card.Description>
          </Card.Base>
        </div>
      </div>
    </div>
  );
};

FullPageBanner.displayName = "FullPageBanner";

export { FullPageBanner };
