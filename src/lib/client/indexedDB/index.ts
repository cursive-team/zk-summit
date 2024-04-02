import localForage from "localforage";

export const clearIndexedDB = async (): Promise<void> => {
  try {
    await localForage.clear();
    // console.log("LocalForage has been cleared");
  } catch (err) {
    console.error("Failed to clear LocalForage", err);
  }
};
