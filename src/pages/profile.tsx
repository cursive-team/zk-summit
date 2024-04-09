import Profile from "@/components/Profile";
import { deleteAccountFromLocalStorage } from "@/lib/client/localStorage";
import { supabase } from "@/lib/client/realtime";

export default function ProfilePage() {
  const handleSignout = async () => {
    deleteAccountFromLocalStorage();
    supabase.auth.signOut();
    window.location.href = "/";
  };

  return <Profile handleSignout={handleSignout} />;
}
