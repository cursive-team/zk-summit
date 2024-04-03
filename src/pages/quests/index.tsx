import { Filters } from "@/components/Filters";
import { Placeholder } from "@/components/placeholders/Placeholder";
import { QuestCard } from "@/components/cards/QuestCard";
import { LoadingWrapper } from "@/components/wrappers/LoadingWrapper";
import { useFetchQuests } from "@/hooks/useFetchQuests";

import Link from "next/link";
import React, { useMemo, useRef, useState } from "react";

import { QuestWithCompletion } from "@/types";
import { getPinnedQuest } from "@/lib/client/localStorage/questPinned";
import { useQuestRequirements } from "@/hooks/useQuestRequirements";

export default function QuestsPage() {
  const pinnedQuests = useRef<Set<number>>(getPinnedQuest());
  const { isLoading, data: allQuests = [] } = useFetchQuests();

  const displayQuests: QuestWithCompletion[] = useMemo(() => {
    const unorderedQuests = allQuests.filter((quest) => !quest.isHidden);
    const quests = unorderedQuests.sort((a, b) => b.priority - a.priority);

    const pinnedQuest = quests.filter((quest) =>
      pinnedQuests.current.has(quest.id)
    );
    const notPinnedQuest = quests.filter(
      (quest) => !pinnedQuests.current.has(quest.id)
    );

    return [...pinnedQuest, ...notPinnedQuest];
  }, [allQuests, pinnedQuests]);

  const { numRequirementsSatisfied } = useQuestRequirements(displayQuests);

  return (
    <div className="flex flex-col gap-2">
      <LoadingWrapper
        className="flex flex-col gap-2"
        isLoading={isLoading}
        fallback={<Placeholder.List items={3} />}
        noResultsLabel="No quests found"
      >
        {displayQuests.map(
          (
            {
              id,
              name,
              description,
              userRequirements,
              locationRequirements,
              isCompleted = false,
              userTapReq,
            }: QuestWithCompletion,
            index
          ) => {
            const key = `${id}-${index}`;

            return (
              <Link href={`/quests/${id}`} key={key}>
                <QuestCard
                  title={name}
                  description={description}
                  userTapReqCount={userTapReq ? 1 : 0}
                  completedReqs={numRequirementsSatisfied[index]}
                  userRequirements={userRequirements}
                  locationRequirements={locationRequirements}
                  isCompleted={isCompleted}
                  isPinned={pinnedQuests.current.has(id)}
                />
              </Link>
            );
          }
        )}
      </LoadingWrapper>
    </div>
  );
}
