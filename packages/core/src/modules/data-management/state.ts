export interface DataManagementState {
  rowModelType: 'clientSide' | 'serverSide' | 'infinite' | 'viewport';
  getRowIdField: string;
  asyncTransactionWaitMillis: number;
  cacheBlockSize: number;
  maxBlocksInCache: number;
  rowBuffer: number;
}

export const INITIAL_DATA_MANAGEMENT: DataManagementState = {
  rowModelType: 'clientSide',
  getRowIdField: 'id',
  asyncTransactionWaitMillis: 100,
  cacheBlockSize: 100,
  maxBlocksInCache: -1,
  rowBuffer: 10,
};
