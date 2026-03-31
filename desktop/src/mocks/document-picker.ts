// @react-native-documents/picker mock for Electron desktop
// App.tsx uses: pickSingle, pick, keepLocalCopy, isCancel, types

const CANCEL_ERR = 'User cancelled document picking.';

export const pick = async (_opts?: any) => {
    const file = await (window as any).swiftshareIPC.pickDocument();
    if (!file) {
        const err: any = new Error(CANCEL_ERR);
        err.code = 'DOCUMENT_PICKER_CANCELED';
        throw err;
    }
    return [file];
};

export const pickSingle = async (_opts?: any) => {
    const file = await (window as any).swiftshareIPC.pickDocument();
    if (!file) {
        const err: any = new Error(CANCEL_ERR);
        err.code = 'DOCUMENT_PICKER_CANCELED';
        throw err;
    }
    return file;
};

// keepLocalCopy: on desktop we copy to a temporary "cache" directory so that
// the shared App.tsx logic can safely unlink the file without deleting the original.
export const keepLocalCopy = async (opts: { files: Array<{ uri: string; fileName: string }> }) => {
    if (!opts?.files?.length) return [];
    
    const results = [];
    for (const file of opts.files) {
        // Convert file://uri to a plain path for the IPC
        const plainPath = file.uri.startsWith('file://') ? file.uri.slice(7) : file.uri;
        const localUri = await (window as any).swiftshareIPC.fsCopyToCache(plainPath);
        results.push({
            status: localUri ? 'success' as const : 'error' as const,
            localUri: localUri || file.uri,
        });
    }
    return results;
};

export const isCancel = (err: any): boolean => {
    return (
        err?.code === 'DOCUMENT_PICKER_CANCELED' ||
        err?.message === CANCEL_ERR ||
        err?.message === 'aborted'
    );
};

export const types = {
    allFiles: '*/*',
    images: 'image/*',
    video: 'video/*',
    audio: 'audio/*',
    pdf: 'application/pdf',
    plainText: 'text/plain',
    zip: 'application/zip',
};

export default {
    pick,
    pickSingle,
    keepLocalCopy,
    isCancel,
    types,
};
