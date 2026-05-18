import {
  listProjectEnvironments,
  createProjectEnvironment,
  renameProjectEnvironment,
  setDefaultProjectEnvironment,
  deleteProjectEnvironment,
  listProjectBindings,
  listEnvBindings,
  upsertEnvBinding,
  deleteEnvBinding,
  renameProjectAlias,
} from '@/lib/sdk'
import { wrapResponse } from './token'
import type {
  ProjectEnvironment,
  EndpointDatasourceBinding,
  CreateEnvironmentRequest,
  RenameEnvironmentRequest,
  UpsertBindingRequest,
  RenameAliasRequest,
} from './types'

export const apiListEnvironments = (slug: string, projectId: number) =>
  wrapResponse<ProjectEnvironment[]>(listProjectEnvironments({ path: { slug, projectId } }))

export const apiCreateEnvironment = (slug: string, projectId: number, req: CreateEnvironmentRequest) =>
  wrapResponse<ProjectEnvironment>(createProjectEnvironment({ path: { slug, projectId }, body: req }))

export const apiRenameEnvironment = (slug: string, projectId: number, envId: number, req: RenameEnvironmentRequest) =>
  wrapResponse<void>(renameProjectEnvironment({ path: { slug, projectId, envId }, body: req }))

export const apiSetDefaultEnvironment = (slug: string, projectId: number, envId: number) =>
  wrapResponse<void>(setDefaultProjectEnvironment({ path: { slug, projectId, envId } }))

export const apiDeleteEnvironment = (slug: string, projectId: number, envId: number) =>
  wrapResponse<void>(deleteProjectEnvironment({ path: { slug, projectId, envId } }))

export const apiListProjectBindings = (slug: string, projectId: number) =>
  wrapResponse<EndpointDatasourceBinding[]>(listProjectBindings({ path: { slug, projectId } }))

export const apiListEnvBindings = (slug: string, projectId: number, envId: number) =>
  wrapResponse<EndpointDatasourceBinding[]>(listEnvBindings({ path: { slug, projectId, envId } }))

export const apiUpsertBinding = (slug: string, projectId: number, envId: number, req: UpsertBindingRequest) =>
  wrapResponse<void>(upsertEnvBinding({ path: { slug, projectId, envId }, body: req }))

export const apiDeleteBinding = (slug: string, projectId: number, envId: number, alias: string) =>
  wrapResponse<void>(deleteEnvBinding({ path: { slug, projectId, envId, alias } }))

export const apiRenameAlias = (slug: string, projectId: number, req: RenameAliasRequest) =>
  wrapResponse<void>(renameProjectAlias({ path: { slug, projectId }, body: req }))
