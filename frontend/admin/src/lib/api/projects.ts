import { listProjects, createProject, getProject, updateProject, deleteProject } from '@/lib/sdk'
import { wrapResponse } from './token'
import type { Project, ListQuery, PaginatedData, CreateProjectRequest, UpdateProjectRequest } from './types'

export const apiListProjects = (slug: string, q: ListQuery = {}) =>
  wrapResponse<PaginatedData<Project>>(listProjects({ path: { slug }, query: q }))

export const apiCreateProject = (slug: string, req: CreateProjectRequest) =>
  wrapResponse<Project>(createProject({ path: { slug }, body: req }))

export const apiGetProject = (slug: string, projectId: number) =>
  wrapResponse<Project>(getProject({ path: { slug, projectId } }))

export const apiUpdateProject = (slug: string, projectId: number, req: UpdateProjectRequest) =>
  wrapResponse<Project>(updateProject({ path: { slug, projectId }, body: req }))

export const apiDeleteProject = (slug: string, projectId: number) =>
  wrapResponse<void>(deleteProject({ path: { slug, projectId } }))
