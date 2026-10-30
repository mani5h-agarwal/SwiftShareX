export type PickedFile = {
  name: string;
  uri: string;
  size?: number | null;
};

export type FileTransferRecord = {
  id: string;
  fileName: string;
  fileSize?: number;
  savedPath?: string;
  timestamp: Date;
  status: 'completed' | 'cancelled' | 'in-progress' | 'queued';
};
