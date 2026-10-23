import React, { createContext, useContext, type ReactNode } from 'react';

/** The client record being viewed in the client record screen, shared with its sections. */
export type TraineeRecord = {
  id: string;
  name: string;
};

const TraineeRecordContext = createContext<TraineeRecord | null>(null);

export function TraineeRecordProvider({ record, children }: { record: TraineeRecord; children: ReactNode }): React.JSX.Element {
  return <TraineeRecordContext.Provider value={record}>{children}</TraineeRecordContext.Provider>;
}

/** The client record of the surrounding client record screen. */
export function useTraineeRecord(): TraineeRecord {
  const value = useContext(TraineeRecordContext);
  if (!value) {
    throw new Error('useTraineeRecord must be used inside the client record screen');
  }
  return value;
}
