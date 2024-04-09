import { User } from "@/lib/client/localStorage";
import { Remote, wrap } from "comlink";
import { useRef, useState } from "react";

export const useWorker = () => {

    const [folding, setFolding] = useState<boolean>(false);
    const [downloadingChunks, setDownloadingChunks] = useState<boolean>(false);
    const [chunksDownloaded, setChunksDownloaded] = useState<boolean>(false)
    const [worker, setWorker] = useState<Worker | null>(null);

    const workerAPIRef = useRef<Remote<{
        workerFold: (users: User[]) => Promise<void>,
        workerStartFold: (user: User) => Promise<void>,
        workerIncrementFold: (user: User) => Promise<void>,
        workerObfuscateFold: () => Promise<void>,
        workerGetParamsChunk: () => Promise<boolean>,
    }> | null>();

    const downloadParamsChunk = async () => {
        init();
        setDownloadingChunks(true);
        let finished = await workerAPIRef.current?.workerGetParamsChunk();
        if (finished) {
            setChunksDownloaded(true);
            setDownloadingChunks(false);
        }
        terminate();
    }

    const foldAll = async (users: User[]) => {
        init();
        setFolding(true);
        await workerAPIRef.current?.workerFold(users);
        setFolding(false);
        terminate();
    }

    const init = () => {
        const worker = new Worker(new URL('../lib/client/worker.ts', import.meta.url));
        const workerAPI = wrap<import("../lib/client/worker").FoldingWorker>(worker);
        workerAPIRef.current = workerAPI;
        setWorker(worker);
    }

    const startFold = async (user: User) => {
        init();
        setFolding(true);
        await workerAPIRef.current?.workerStartFold(user);
        setFolding(false);
        terminate();
    }

    const incrementFold = async (user: User) => {
        init();
        setFolding(true);
        await workerAPIRef.current?.workerIncrementFold(user);
        setFolding(false);
        terminate()
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
        downloadParamsChunk,
        foldAll,
        startFold,
        incrementFold,
        obfuscateFold,
        folding,
        downloadingChunks,
        chunksDownloaded,
    }
}