import { LocationSignature, User } from "@/lib/client/localStorage";
import { Remote, wrap } from "comlink";
import { useRef, useState } from "react";

export const useWorker = () => {

    const [folding, setFolding] = useState<boolean>(false);
    const [completed, setCompleted] = useState<boolean>(false);
    const [downloadingChunks, setDownloadingChunks] = useState<boolean>(false);
    const [chunksDownloaded, setChunksDownloaded] = useState<boolean>(false)
    const [worker, setWorker] = useState<Worker | null>(null);

    const workerAPIRef = useRef<Remote<{
        work: (users: User[], talks: LocationSignature[]) => Promise<void>,
        workerObfuscateFold: () => Promise<void>,
    }> | null>();

    const init = () => {
        const worker = new Worker(new URL('../lib/client/worker.ts', import.meta.url));
        const workerAPI = wrap<import("../lib/client/worker").FoldingWorker>(worker);
        workerAPIRef.current = workerAPI;
        setWorker(worker);
    }
 
    const work = async (users: User[], talks: LocationSignature[]) => {
        init();
        setFolding(true);
        await workerAPIRef.current?.work(users, talks);
        setFolding(false);
        setCompleted(true);
        terminate();
    }

    const obfuscateFold = async () => {
        init();
        setFolding(true);
        await workerAPIRef.current?.workerObfuscateFold();
        setFolding(false);
        terminate()
    }

    const terminate = () => {
        if (!worker) return;
        worker.terminate();
        workerAPIRef.current = null;
    }

    return {
        work,
        obfuscateFold,
        folding,
        completed,
        downloadingChunks,
        chunksDownloaded,
    }
}