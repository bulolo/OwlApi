/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CreateDataSourceRequest } from '../models/CreateDataSourceRequest';
import type { UpdateDataSourceRequest } from '../models/UpdateDataSourceRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class DataSourcesService {
    /**
     * 数据源列表
     * @param slug
     * @returns any OK
     * @throws ApiError
     */
    public static listDataSources(
        slug: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/tenants/{slug}/datasources',
            path: {
                'slug': slug,
            },
        });
    }
    /**
     * 创建数据源
     * @param slug
     * @param requestBody
     * @returns any OK
     * @throws ApiError
     */
    public static createDataSource(
        slug: string,
        requestBody: CreateDataSourceRequest,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/tenants/{slug}/datasources',
            path: {
                'slug': slug,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 获取数据源详情
     * @param slug
     * @param datasourceId
     * @returns any OK
     * @throws ApiError
     */
    public static getDataSource(
        slug: string,
        datasourceId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/tenants/{slug}/datasources/{datasourceId}',
            path: {
                'slug': slug,
                'datasourceId': datasourceId,
            },
        });
    }
    /**
     * 编辑数据源
     * @param slug
     * @param datasourceId
     * @param requestBody
     * @returns any OK
     * @throws ApiError
     */
    public static updateDataSource(
        slug: string,
        datasourceId: number,
        requestBody: UpdateDataSourceRequest,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/tenants/{slug}/datasources/{datasourceId}',
            path: {
                'slug': slug,
                'datasourceId': datasourceId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 删除数据源
     * @param slug
     * @param datasourceId
     * @returns any OK
     * @throws ApiError
     */
    public static deleteDataSource(
        slug: string,
        datasourceId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/tenants/{slug}/datasources/{datasourceId}',
            path: {
                'slug': slug,
                'datasourceId': datasourceId,
            },
        });
    }
}
