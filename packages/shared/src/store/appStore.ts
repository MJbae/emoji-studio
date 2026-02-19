import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createConfigSlice, type ConfigSlice } from './slices/configSlice';
import { createWorkflowSlice, type WorkflowSlice } from './slices/workflowSlice';
import { createAssetsSlice, type AssetsSlice } from './slices/assetsSlice';
import { createJobsSlice, type JobsSlice } from './slices/jobsSlice';

export type AppState = ConfigSlice & WorkflowSlice & AssetsSlice & JobsSlice;

export const useAppStore = create<AppState>()(
  persist(
    (...args) => ({
      ...createConfigSlice(...args),
      ...createWorkflowSlice(...args),
      ...createAssetsSlice(...args),
      ...createJobsSlice(...args),
    }),
    {
      name: 'emoticon-studio-config',
      partialize: (state) => ({
        language: state.language,
        defaultPlatform: state.defaultPlatform,
      }),
    },
  ),
);

export function getAppState(): AppState {
  return useAppStore.getState();
}
