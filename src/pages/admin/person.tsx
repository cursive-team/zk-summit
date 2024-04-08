import { Header } from "@/components/modals/QuestRequirementModal";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { AdminUserInfo } from "../api/admin/users";
import { Icons } from "@/components/Icons";
import { Card } from "@/components/cards/Card";
import useRequireAdmin from "@/hooks/useRequireAdmin";
import { getAuthToken } from "@/lib/client/localStorage";
import { IconCircle } from "@/components/IconCircle";

const AdminTapPersonPage = () => {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUserInfo[]>([]);

  useRequireAdmin();

  const handleTapPerson = (chipId: string) => {
    router.push(`/tap?iykRef=${chipId}&mockRef=true`);
  };

  useEffect(() => {
    const fetchUsers = async () => {
      const authToken = getAuthToken();
      if (!authToken || authToken.expiresAt < new Date()) {
        router.push("/login");
        return;
      }

      const response = await fetch(`/api/admin/users?token=${authToken.value}`);
      if (!response.ok) {
        console.error("Error fetching users: ", response.statusText);
        return;
      }

      const users = await response.json();
      setUsers(users);
    };
    fetchUsers();
  }, [router]);

  return (
    <div>
      <div className="flex flex-col gap-8">
        <Header title="Mock tap a person" />
        <div className="flex flex-col gap-4">
          <div>
            {users.map(({ id, displayName, chipId }, index) => {
              return (
                <div
                  key={index}
                  onClick={() => handleTapPerson(chipId)}
                  className="flex justify-between border-b w-full border-gray-300  last-of-type:border-none first-of-type:pt-0 py-1"
                >
                  <div className="flex items-center gap-2">
                    <IconCircle>
                      <Icons.Person size={12} />
                    </IconCircle>
                    <Card.Title>{displayName}</Card.Title>
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

AdminTapPersonPage.getInitialProps = () => {
  return { showFooter: false, showHeader: true };
};

export default AdminTapPersonPage;
