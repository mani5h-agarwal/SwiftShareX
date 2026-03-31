// mock for react-native-fs
export default {
    unlink: async (path: string) => {
        return await (window as any).swiftshareIPC.fsUnlink(path);
    },
    // We can add read/write but the TransferEngine operates directly via C++.
    CachesDirectoryPath: '/tmp/swiftshare_caches',
    DocumentDirectoryPath: '/tmp/swiftshare_docs',
};
