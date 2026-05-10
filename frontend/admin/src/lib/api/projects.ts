import { listProjects, createProject, getProject, updateProject, deleteProject } from '@/lib/sdk'
import type { Project, ListQuery, PaginatedData, CreateProjectRequest, UpdateProjectRequest } from './types'

const cast = <T>(p: unknown): Promise<T> => p as Promise<T>

export const apiListProjects = (slug: string, q: ListQuery = {}) => cast<PaginatedData<Project>>(listProjects({ path: { slug }, query: q }))
export const apiCreateProject = (slug: string, req: CreateProjectRequest) => cast<Project>(createProject({ path: { slug }, body: req }))
export const apiGetProject = (slug: string, projectId: number) => cast<Project>(getProject({ path: { slug, projectId } }))
export const apiUpdateProject = (slug: string, projectId: number, req: UpdateProjectRequest) => cast<Project>(updateProject({ path: { slug, projectId }, body: req }))
export const apiDeleteProject = (slug: string, projectId: number) => cast<void>(deleteProject({ path: { slug, projectId } }))
