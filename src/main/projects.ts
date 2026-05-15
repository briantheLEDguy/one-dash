import { app, dialog } from 'electron'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'
import type { Project } from '../shared/types'

const PROJECTS_FILE = join(app.getPath('userData'), 'one-dash-projects.json')

async function readAll(): Promise<Project[]> {
  try {
    const raw = await readFile(PROJECTS_FILE, 'utf-8')
    return JSON.parse(raw) as Project[]
  } catch {
    return []
  }
}

async function writeAll(projects: Project[]): Promise<void> {
  await writeFile(PROJECTS_FILE, JSON.stringify(projects, null, 2), 'utf-8')
}

export async function listProjects(): Promise<Project[]> {
  const projects = await readAll()
  return projects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function saveProject(project: Project): Promise<Project> {
  const projects = await readAll()
  const now = new Date().toISOString()

  const saved: Project = project.id
    ? { ...project, updatedAt: now }
    : { ...project, id: randomUUID(), createdAt: now, updatedAt: now }

  const idx = projects.findIndex((p) => p.id === saved.id)
  if (idx >= 0) {
    projects[idx] = saved
  } else {
    projects.push(saved)
  }

  await writeAll(projects)
  return saved
}

export async function deleteProject(id: string): Promise<void> {
  const projects = await readAll()
  await writeAll(projects.filter((p) => p.id !== id))
}

export async function exportProject(project: Project): Promise<void> {
  const { filePath } = await dialog.showSaveDialog({
    title: 'Export Project',
    defaultPath: `${project.name.replace(/[^a-z0-9_\-]/gi, '_')}.json`,
    filters: [{ name: 'One-Dash Project', extensions: ['json'] }]
  })
  if (!filePath) return
  await writeFile(filePath, JSON.stringify(project, null, 2), 'utf-8')
}

export async function importProject(): Promise<Project | null> {
  const { filePaths } = await dialog.showOpenDialog({
    title: 'Import Project',
    filters: [{ name: 'One-Dash Project', extensions: ['json'] }],
    properties: ['openFile']
  })
  if (!filePaths[0]) return null
  const raw = await readFile(filePaths[0], 'utf-8')
  const project = JSON.parse(raw) as Project
  // Re-save with a new id to avoid collisions, preserving original timestamps
  return saveProject({ ...project, id: '' })
}
