import { TreeType } from "@/lib/client/indexDB";
import { LocationSignature, User } from "@/lib/client/localStorage";
import { Remote, wrap } from "comlink";
import { useRef, useState } from "react";

export const useWorker = () => {
  const [folding, setFolding] = useState<boolean>(false);
  const [obfuscating, setObfuscating] = useState<boolean>(false);
  const [completed, setCompleted] = useState<boolean>(false);
  const [downloadingChunks, setDownloadingChunks] = useState<boolean>(false);
  const [chunksDownloaded, setChunksDownloaded] = useState<boolean>(false);
  const [worker, setWorker] = useState<Worker | null>(null);

  const workerAPIRef = useRef<Remote<{
    work: (users: User[], talks: LocationSignature[]) => Promise<void>;
    finalize: (treeType: TreeType) => Promise<boolean>;
    verify: (proof: Blob, numFolded: number, treeType: TreeType) => Promise<boolean>;
  }> | null>();

  const init = () => {
    const worker = new Worker(
      new URL("../lib/client/worker.ts", import.meta.url)
    );
    const workerAPI =
      wrap<import("../lib/client/worker").FoldingWorker>(worker);
    workerAPIRef.current = workerAPI;
    setWorker(worker);
  };

  const work = async (users: User[], talks: LocationSignature[]) => {
    init();
    setFolding(true);
    await workerAPIRef.current?.work(users, talks);
    setFolding(false);
    setCompleted(true);
    terminate();
  };

  const finalize = async (treeType: TreeType): Promise<boolean> => {
    init();
    setObfuscating(true);
    const success = await workerAPIRef.current?.finalize(treeType);
    setObfuscating(false);
    terminate();
    return success!;
  };

  const verify = async (proof: Blob, numFolded: number, treeType: TreeType): Promise<boolean> => {
    init();
    const success = await workerAPIRef.current?.verify(proof, numFolded, treeType);
    terminate();
    return success!;
  };

  const terminate = () => {
    if (!worker) return;
    worker.terminate();
    workerAPIRef.current = null;
  };

  return {
    work,
    finalize,
    verify,
    obfuscating,
    folding,
    completed,
    downloadingChunks,
    chunksDownloaded,
  };
};
