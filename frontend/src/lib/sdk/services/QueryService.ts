/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class QueryService {
    /**
     * 执行 SQL 查询 (GET)
     * @param path
     * @param xTenantId
     * @param xRunnerId
     * @returns any 查询结果 (JSON)
     * @throws ApiError
     */
    public static executeQueryGet(
        path: string,
        xTenantId: string,
        xRunnerId: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/query/{path}',
            path: {
                'path': path,
            },
            headers: {
                'X-Tenant-ID': xTenantId,
                'X-Runner-ID': xRunnerId,
            },
        });
    }
    /**
     * 执行 SQL 查询 (POST)
     * @param path
     * @param xTenantId
     * @param xRunnerId
     * @returns any 查询结果 (JSON)
     * @throws ApiError
     */
    public static executeQueryPost(
        path: string,
        xTenantId: string,
        xRunnerId: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/query/{path}',
            path: {
                'path': path,
            },
            headers: {
                'X-Tenant-ID': xTenantId,
                'X-Runner-ID': xRunnerId,
            },
        });
    }
}
