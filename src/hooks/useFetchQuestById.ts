import { useQuery } from "@tanstack/react-query";
import { QuestWithRequirements } from "@/types";

export const useFetchQuestById = (questId: number | string) => {
  return useQuery({
    enabled: !!questId,
    queryKey: ["quest", questId],
    queryFn: async (): Promise<QuestWithRequirements | null> => {
      try {
        const response = await fetch(`/api/quest/${questId}`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const quest: QuestWithRequirements = await response.json();
        return quest;
      } catch (error) {
        console.error("Error fetching quest:", error);
        return null;
      }
    },
  });
};
