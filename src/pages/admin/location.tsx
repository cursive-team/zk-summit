import { Header } from "@/components/modals/QuestRequirementModal";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { Icons } from "@/components/Icons";
import { Card } from "@/components/cards/Card";
import { AdminLocationInfo } from "../api/admin/locations";
import useRequireAdmin from "@/hooks/useRequireAdmin";
import { getAuthToken } from "@/lib/client/localStorage";
import { IconCircle } from "@/components/IconCircle";

const AdminTapLocationPage = () => {
  const router = useRouter();
  const [locations, setLocations] = useState<AdminLocationInfo[]>([]);

  useRequireAdmin();

  const handleTapLocation = (chipId: string) => {
    router.push(`/tap?iykRef=${chipId}&mockRef=true`);
  };

  useEffect(() => {
    const fetchLocations = async () => {
      const authToken = getAuthToken();
      if (!authToken || authToken.expiresAt < new Date()) {
        router.push("/login");
        return;
      }

      const response = await fetch(
        `/api/admin/locations?token=${authToken.value}`
      );
      if (!response.ok) {
        console.error("Error fetching locations: ", response.statusText);
        return;
      }

      const locations = await response.json();
      setLocations(locations);
    };
    fetchLocations();
  }, [router]);

  return (
    <div>
      <div className="flex flex-col gap-8">
        <Header title="Mock tap a location" />
        <div className="flex flex-col gap-4">
          <div>
            {locations.map(({ id, name, chipId }, index) => {
              return (
                <div
                  key={index}
                  onClick={() => handleTapLocation(chipId)}
                  className="flex justify-between border-b w-full border-gray-300  last-of-type:border-none first-of-type:pt-0 py-1"
                >
                  <div className="flex items-center gap-2">
                    <IconCircle>
                      <Icons.home size={12} />
                    </IconCircle>
                    <Card.Title>{name}</Card.Title>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

AdminTapLocationPage.getInitialProps = () => {
  return { showFooter: false, showHeader: true };
};

export default AdminTapLocationPage;
