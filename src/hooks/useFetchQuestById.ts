import { useQuery } from "@tanstack/react-query";
import { QuestWithRequirements } from "@/types";
import { getAllQuestCompleted } from "@/lib/client/localStorage";

export const useFetchQuestById = (questId: number | string) => {
  const questCompleted = getAllQuestCompleted();
  const completedQuestIds: string[] = Object.keys(questCompleted);

  return useQuery({
    enabled: !!questId,
    queryKey: ["quest", questId],
    queryFn: async (): Promise<
      (QuestWithRequirements & { isCompleted: boolean }) | null
    > => {
      try {
        const response = await fetch(`/api/quest/${questId}`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const quest: QuestWithRequirements = await response.json();
        return {
          ...quest,
          isCompleted: completedQuestIds?.includes(quest.id.toString()),
        };
      } catch (error) {
        console.error("Error fetching quest:", error);
        return null;
      }
    },
  });
};
