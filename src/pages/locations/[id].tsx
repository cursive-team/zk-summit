import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { ErrorResponse, LocationWithQuests } from "@/types";
import {
  LocationSignature,
  getLocationSignature,
} from "@/lib/client/localStorage";
import { classed } from "@tw-classed/react";
import useSettings from "@/hooks/useSettings";
import { AppBackHeader } from "@/components/AppHeader";
import { toast } from "sonner";
import { LoadingWrapper } from "@/components/wrappers/LoadingWrapper";
import { LocationDetailPlaceholder } from "@/components/placeholders/LocationDetailPlaceholder";
import { Card } from "@/components/cards/Card";
import Link from "next/link";
import { Button } from "@/components/Button";
import { Icons } from "@/components/Icons";

const Title = classed.span("text-iron-800 text-xs font-normal font-sans");
const Description = classed.h5("text-iron-950 font-normal text-sm");

const stageMapping: Record<string, string> = {
  main: "Mainstage",
  side: "Sidestage",
  breakout: "Breakout room",
  workshop: "Workshop room",
};

const LocationDetails = () => {
  const router = useRouter();
  const { id } = router.query;
  const [location, setLocation] = useState<LocationWithQuests>();

  useEffect(() => {
    const fetchLocation = async () => {
      if (typeof id === "string") {
        try {
          const response = await fetch(`/api/location/${id}`);
          if (!response.ok) {
            const errorResponse: ErrorResponse = await response.json();
            console.error(errorResponse.error);
            toast.error("An error occurred. Please try again.");
            router.push("/");
          } else {
            const data: LocationWithQuests = await response.json();
            setLocation(data);
          }
        } catch (err) {
          toast.error("An error occurred. Please try again.");
          router.push("/");
        }

        const tap = router.query.tap;
        if (tap === "true") {
          toast.success("You've successfully tapped in!", {
            position: "bottom-center",
          });
        }
      }
    };

    fetchLocation();
  }, [router, id]);

  return (
    <div>
      <AppBackHeader redirectTo="/" />
      <LoadingWrapper
        isLoading={!location}
        fallback={<LocationDetailPlaceholder />}
        className="flex flex-col gap-6"
      >
        {location && (
          <div className="flex flex-col gap-4">
            <Card.Base
              className="!border-primary/10 bg-cover bg-center bg-no-repeat"
              style={{
                backgroundImage: "url('/bg-gradient-card.png')",
              }}
            >
              <div className="flex flex-col py-4 px-3 min-h-[180px]">
                <span className="text-primary text-xs font-semibold font-sans">
                  {stageMapping[location.stage]}
                </span>
                <h5 className="mt-auto text-primary font-medium text-[21px] leading-[21px]">
                  {location.description}
                </h5>
              </div>
            </Card.Base>
            {location.speaker && (
              <div className="flex flex-col gap-1">
                <Title>Speaker</Title>
                <Description>{location.speaker}</Description>
              </div>
            )}
            {location.description && (
              <div className="flex flex-col gap-1">
                <Title>Description</Title>
                <Description>{location.description}</Description>
              </div>
            )}
            {location.slidesLink && (
              <Link href={location.slidesLink} target="_blank">
                <Button variant="white">
                  <div className="flex w-full items-center justify-between">
                    <span className="text-iron-600 font-semibold text-xs">
                      Slides link
                    </span>
                    <Icons.ExternalLink className="text-gray-10" />
                  </div>
                </Button>
              </Link>
            )}
            {location.speakerSocial && (
              <Link href={location.speakerSocial} target="_blank">
                <Button variant="white">
                  <div className="flex w-full items-center justify-between">
                    <span className="text-iron-600 font-semibold text-xs">
                      Follow the speaker
                    </span>
                    <Icons.ExternalLink className="text-gray-10" />
                  </div>
                </Button>
              </Link>
            )}
            <div className=""></div>
          </div>
        )}
      </LoadingWrapper>
    </div>
  );
};

LocationDetails.getInitialProps = () => {
  return { fullPage: true };
};

export default LocationDetails;
