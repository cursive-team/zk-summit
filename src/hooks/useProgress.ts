import { IndexDBWrapper, TreeType } from "@/lib/client/indexDB";
import { getLocationSignatures, getUsers, LocationSignature, User } from "@/lib/client/localStorage";
import { Remote, wrap } from "comlink";
import { useEffect, useRef, useState } from "react";

export const useWorker = () => {
    const [db, setDB] = useState<IndexDBWrapper | null>(null);
    const [numParams, setNumParams] = useState<number>(0);
    const [numAttendees, setNumAttendees] = useState<number>(0);
    const [numFoldedAttendees, setNumFoldedAttendees] = useState<number>(0);
    const [numSpeakers, setNumSpeakers] = useState<number>(0);
    const [numFoldedSpeakers, setNumFoldedSperakser] = useState<number>(0);
    const [numTalks, setFoldedTalks] = useState<number>(0);
    const [numFoldedTalks, setNumFoldedTalks] = useState<number>(0);
    const [foldingCompleted, setFoldingCompleted] = useState(false);

    useEffect(() => {
        if (db) return;
        (async () => {
            const init = async () => {
                const db = new IndexDBWrapper();
                await db.init();
                setDB(db);
            }
        })();
    }, []);

    const updateProgress = async () => {
        if (!db || isComplete) return;
        // check if params is done
        if (numParams <= 9) {
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
                !user.isSpeaker && user.pkId !== "0" && user.sig && user.sigPk && user.msg
            );
        });
        let speakers = users.filter((user) => {
            return (
                user.isSpeaker && user.pkId !== "0" && user.sig && user.sigPk && user.msg
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
        setNumFoldedSperakser(numSpeakersFolded);
        setNumFoldedTalks(talks.length);
        setFoldedTalks(numTalksFolded);

        if (
            attendees.length === numAttendeesFolded
            && speakers.length === numSpeakersFolded
            && talks.length === numTalksFolded
        ) {
            setFoldingCompleted(true);
        }
    }

    return {
        updateProgress,
        numParams,
        numAttendees,
        numFoldedAttendees,
        numSpeakers,
        numFoldedSpeakers,
        numTalks,
        numFoldedTalks,
        foldingCompleted
    };
};
