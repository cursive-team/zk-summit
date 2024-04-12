import { IndexDBWrapper, TreeType } from '@/lib/client/indexDB';
import { getLocationSignatures, getUsers } from '@/lib/client/localStorage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/cards/Card';

export const useProgress = () => {
  const [db, setDB] = useState<IndexDBWrapper | null>(null);
  const [numParams, setNumParams] = useState<number>(0);
  const [numAttendees, setNumAttendees] = useState<number>(0);
  const [numFoldedAttendees, setNumFoldedAttendees] = useState<number>(0);
  const [numSpeakers, setNumSpeakers] = useState<number>(0);
  const [numFoldedSpeakers, setNumFoldedSpeaker] = useState<number>(0);
  const [numTalks, setNumTalks] = useState<number>(0);
  const [numFoldedTalks, setNumFoldedTalks] = useState<number>(0);
  const [foldingCompleted, setFoldingCompleted] = useState(false);

  const progress = useMemo(() => {
    let progressPercent = 0;
    let progressText = '';
    if (numParams < 10) {
      progressPercent = numParams / 10;
      progressText = `Downloaded ${numParams} out of 10 chunked params`;
    } else if (numFoldedAttendees !== numAttendees) {
      progressPercent = numFoldedAttendees / numAttendees;
      progressText = `Folded ${numFoldedAttendees} of ${numAttendees} attendees`;
    } else if (numFoldedSpeakers !== numSpeakers) {
      progressPercent = numFoldedSpeakers / numSpeakers;
      progressText = `Folded ${numFoldedSpeakers} of ${numSpeakers} speakers`;
    } else {
      progressPercent = numFoldedTalks / numTalks;
      progressText = `Folded ${numFoldedTalks} of ${numTalks} talks`;
    }

    return (
      <div>
        <div className='mb-2'>{progressText}</div>
        <div className='relative'>
          <Card.Progress
            style={{
              width: `${!isNaN(progressPercent) ? progressPercent * 100 : 0}%`,
            }}
          />
        </div>
      </div>
    );
  }, [
    numAttendees,
    numFoldedAttendees,
    numParams,
    numSpeakers,
    numFoldedSpeakers,
    numTalks,
    numFoldedTalks,
  ]);

  const updateProgress = useCallback(async () => {
    if (!db || foldingCompleted) return;
    // check if params is done
    if (!numParams) {
      // Initial check
      const chunkCount = await db.countChunks();
      setNumParams(chunkCount);
      if (chunkCount <= 9) {
        return;
      }
    } else if (numParams <= 9) {
      // if params not done, check # and return
      const chunkCount = await db.countChunks();
      setNumParams(chunkCount);
      return;
    }
    // else count number of sigs

    // get all users and locations
    const users = Object.values(getUsers());
    const talks = Object.values(getLocationSignatures());

    // sort attendees and users that can be used for membership proofs
    const attendees = users.filter((user) => {
      return (
        !user.isSpeaker &&
        user.pkId !== '0' &&
        user.sig &&
        user.sigPk &&
        user.msg
      );
    });
    let speakers = users.filter((user) => {
      return (
        user.isSpeaker &&
        user.pkId !== '0' &&
        user.sig &&
        user.sigPk &&
        user.msg
      );
    });

    // get # of folded attendees, speakers, talks
    const attendeesFold = await db.getFold(TreeType.Attendee);
    const numAttendeesFolded = attendeesFold ? attendeesFold.numFolds : 0;

    const speakersFold = await db.getFold(TreeType.Speaker);
    const numSpeakersFolded = speakersFold ? speakersFold.numFolds : 0;

    const talksFold = await db.getFold(TreeType.Talk);
    const numTalksFolded = talksFold ? talksFold.numFolds : 0;

    setNumAttendees(attendees.length);
    setNumFoldedAttendees(numAttendeesFolded);
    setNumSpeakers(speakers.length);
    setNumFoldedSpeaker(numSpeakersFolded);
    setNumFoldedTalks(numTalksFolded);
    setNumTalks(talks.length);

    if (
      attendees.length === numAttendeesFolded &&
      speakers.length === numSpeakersFolded &&
      talks.length === numTalksFolded
    ) {
      setFoldingCompleted(true);
    }
  }, [db, foldingCompleted]);

  useEffect(() => {
    if (db) return;
    (async () => {
      const db = new IndexDBWrapper();
      await db.init();
      setDB(db);
    })();
  }, []);

  return {
    foldingCompleted,
    progress,
    updateProgress,
  };
};
