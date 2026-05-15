import { create } from 'zustand'
import type { Project } from '../../../src/shared/types'

interface ProjectStoreState {
  currentProject: Project | null
  isDirty: boolean
  setCurrentProject: (project: Project | null) => void
  updateCurrentProject: (updates: Partial<Pick<Project, 'name' | 'devices'>>) => void
  markDirty: () => void
  markClean: () => void
}

export const useProjectStore = create<ProjectStoreState>((set) => ({
  currentProject: null,
  isDirty: false,

  setCurrentProject: (project) =>
    set({ currentProject: project, isDirty: false }),

  updateCurrentProject: (updates) =>
    set((state) =>
      state.currentProject
        ? { currentProject: { ...state.currentProject, ...updates }, isDirty: true }
        : {}
    ),

  markDirty: () => set({ isDirty: true }),
  markClean: () => set({ isDirty: false }),
}))
