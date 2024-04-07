import React, { useState } from "react";
import { getAllMerkleRoots } from "@/lib/client/folding";
import { TreeRoots } from "@/pages/api/tree/root";
import { toast } from "sonner";

const MerkleRootsPage: React.FC = () => {
  const [merkleRoots, setMerkleRoots] = useState<TreeRoots | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchMerkleRoots = async () => {
    setLoading(true);
    try {
      const roots = await getAllMerkleRoots();
      setMerkleRoots(roots);
    } catch (error) {
      console.error("Failed to fetch Merkle roots:", error);
    }
    setLoading(false);
  };

  const copyAttendeeRoot = async () => {
    if (merkleRoots) {
      await navigator.clipboard.writeText(merkleRoots.attendeeMerkleRoot);
      toast.success("Attendee root copied to clipboard!");
    }
  };

  const copySpeakerRoot = async () => {
    if (merkleRoots) {
      await navigator.clipboard.writeText(merkleRoots.speakerMerkleRoot);
      toast.success("Speaker root copied to clipboard!");
    }
  };

  const copyTalksRoot = async () => {
    if (merkleRoots) {
      await navigator.clipboard.writeText(merkleRoots.talksMerkleRoot);
      toast.success("Talks root copied to clipboard!");
    }
  };

  return (
    <div className="p-4 flex flex-col align-middle">
      <button
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        onClick={fetchMerkleRoots}
        disabled={loading}
      >
        {loading ? "Loading..." : "Get Merkle Roots"}
      </button>
      {merkleRoots && (
        <div className="mt-4 space-y-2">
          <div className="mt-4 overflow-hidden flex flex-col align-middle">
            <p className="text-gray-600 dark:text-gray-300 truncate">
              {"Attendee root: " + merkleRoots.attendeeMerkleRoot}
            </p>
            <button
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-700"
              onClick={copyAttendeeRoot}
            >
              Copy Attendee Root
            </button>
          </div>
          <hr className="my-4 border-gray-300 dark:border-gray-600" />
          <div className="mt-4 overflow-hidden flex flex-col align-middle">
            <p className="text-gray-600 dark:text-gray-300 truncate">
              {"Speaker root: " + merkleRoots.speakerMerkleRoot}
            </p>
            <button
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-700"
              onClick={copySpeakerRoot}
            >
              Copy Speaker Root
            </button>
          </div>
          <hr className="my-4 border-gray-300 dark:border-gray-600" />
          <div className="mt-4 overflow-hidden flex flex-col align-middle">
            <p className="text-gray-600 dark:text-gray-300 truncate">
              {"Talks root: " + merkleRoots.talksMerkleRoot}
            </p>
            <button
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-700"
              onClick={copyTalksRoot}
            >
              Copy Talks Root
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MerkleRootsPage;
