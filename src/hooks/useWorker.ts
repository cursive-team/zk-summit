import { User } from "@/lib/client/localStorage";
import { Remote, wrap } from "comlink";
import { useEffect, useRef, useState } from "react";

export const useWorker = () => {

    const [folding, setFolding] = useState<boolean>(false);
    const [downloadingChunks, setDownloadingChunks] = useState<boolean>(false);
    const [chunksDownloaded, setChunksDownloaded] = useState<boolean>(false)

    const workerAPIRef = useRef<Remote<{
        workerStartFold: (user: User) => Promise<void>,
        workerIncrementFold: (user: User) => Promise<void>,
        workerObfuscateFold: () => Promise<void>,
        workerGetParamsChunk: () => Promise<boolean>,
    }>>();

    useEffect(() => {
        const worker = new Worker(new URL('../lib/client/worker.ts', import.meta.url));
        const workerAPI = wrap<import("../lib/client/worker").FoldingWorker>(worker);
        workerAPIRef.current = workerAPI;
    }, [])

    const downloadParamsChunk = async () => {
        setDownloadingChunks(true);
        let finished = await workerAPIRef.current?.workerGetParamsChunk();
        if (finished) {
            setChunksDownloaded(true);
            setDownloadingChunks(false);
        }
    }

    const startFold = async (user: User) => {
        setFolding(true);
        await workerAPIRef.current?.workerStartFold(user);
        setFolding(false);
    }

    const incrementFold = async (user: User) => {
        setFolding(true);
        await workerAPIRef.current?.workerIncrementFold(user);
        setFolding(false);
    }

    const obfuscateFold = async () => {
        setFolding(true);
        await workerAPIRef.current?.workerObfuscateFold();
        setFolding(false);
    }

    return {
        downloadParamsChunk,
        startFold,
        incrementFold,
        obfuscateFold,
        folding,
        downloadingChunks,
        chunksDownloaded
    }
}