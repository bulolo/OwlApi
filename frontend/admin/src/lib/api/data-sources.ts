import { listDataSources, createDataSource, getDataSource, deleteDataSource, updateDataSource } from '@/lib/sdk'
import type { DataSource, ListQuery, PaginatedData, CreateDataSourceRequest, UpdateDataSourceRequest } from './types'

const cast = <T>(p: unknown): Promise<T> => p as Promise<T>

export const apiListDataSources = (slug: string, q: ListQuery = {}) => cast<PaginatedData<DataSource>>(listDataSources({ path: { slug }, query: q }))
export const apiCreateDataSource = (slug: string, req: CreateDataSourceRequest) => cast<DataSource>(createDataSource({ path: { slug }, body: req }))
export const apiGetDataSource = (slug: string, datasourceId: number) => cast<DataSource>(getDataSource({ path: { slug, datasourceId } }))
export const apiUpdateDataSource = (slug: string, datasourceId: number, req: UpdateDataSourceRequest) => cast<DataSource>(updateDataSource({ path: { slug, datasourceId }, body: req }))
export const apiDeleteDataSource = (slug: string, datasourceId: number) => cast<void>(deleteDataSource({ path: { slug, datasourceId } }))
