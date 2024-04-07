import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { toast } from "sonner";

const GetChipIdPage = () => {
  const [chipId, setChipId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    const getChipId = async () => {
      if (!router.query.iykRef) {
        return;
      }

      const iykRef = router.query.iykRef as string;
      const response = await fetch(`/api/chip?iykRef=${iykRef}`);
      const data = await response.json();
      if (data && data.chipId) {
        setChipId(data.chipId);
        setLoading(false);
      } else {
        console.error("Failed to fetch chip ID: ", data.error);
        toast.error("Failed to fetch chip ID");
        setLoading(false);
      }
    };

    getChipId();
  }, [router.query.iykRef]);

  const copyToClipboard = async () => {
    if (chipId) {
      await navigator.clipboard.writeText(chipId);
      toast.success("Chip ID copied to clipboard!");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-100 dark:bg-gray-800">
        <div className="bg-white dark:bg-gray-700 shadow-xl rounded-lg p-6">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            Chip ID
          </h1>
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-100 dark:bg-gray-800">
      <div className="bg-white dark:bg-gray-700 shadow-xl rounded-lg p-6 text-center">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
          Chip ID
        </h1>
        {chipId ? (
          <div className="mt-4">
            <p className="text-gray-600 dark:text-gray-300">{chipId}</p>
            <button
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-700"
              onClick={copyToClipboard}
            >
              Copy Chip ID
            </button>
          </div>
        ) : (
          <p className="text-gray-600 dark:text-gray-300 text-center">
            Failed to fetch chip ID
          </p>
        )}
      </div>
    </div>
  );
};

export default GetChipIdPage;
