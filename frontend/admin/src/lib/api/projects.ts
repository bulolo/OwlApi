import { listProjects, createProject, getProject, updateProject, deleteProject } from '@/lib/sdk'
import type { Project, ListQuery, PaginatedData, CreateProjectRequest, UpdateProjectRequest } from './types'

// ── SDK wrappers ─────────────────────────────────────────────────────────────
// The generated SDK functions return typed data inside an opaque response
// object. We unwrap with `as` only at this boundary so the rest of the app
// stays type-safe.

export const apiListProjects = (slug: string, q: ListQuery = {}) =>
  listProjects({ path: { slug }, query: q }) as unknown as Promise<PaginatedData<Project>>

export const apiCreateProject = (slug: string, req: CreateProjectRequest) =>
  createProject({ path: { slug }, body: req }) as unknown as Promise<Project>

export const apiGetProject = (slug: string, projectId: number) =>
  getProject({ path: { slug, projectId } }) as unknown as Promise<Project>

export const apiUpdateProject = (slug: string, projectId: number, req: UpdateProjectRequest) =>
  updateProject({ path: { slug, projectId }, body: req }) as unknown as Promise<Project>

export const apiDeleteProject = (slug: string, projectId: number) =>
  deleteProject({ path: { slug, projectId } }) as unknown as Promise<void>
