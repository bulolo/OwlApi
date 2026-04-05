/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CreateEndpointRequest } from '../models/CreateEndpointRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class EndpointsService {
    /**
     * 接口列表
     * @param slug
     * @param projectId
     * @returns any OK
     * @throws ApiError
     */
    public static listEndpoints(
        slug: string,
        projectId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/tenants/{slug}/projects/{projectId}/endpoints',
            path: {
                'slug': slug,
                'projectId': projectId,
            },
        });
    }
    /**
     * 创建接口
     * @param slug
     * @param projectId
     * @param requestBody
     * @returns any OK
     * @throws ApiError
     */
    public static createEndpoint(
        slug: string,
        projectId: number,
        requestBody: CreateEndpointRequest,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/tenants/{slug}/projects/{projectId}/endpoints',
            path: {
                'slug': slug,
                'projectId': projectId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 删除接口
     * @param slug
     * @param projectId
     * @param endpointId
     * @returns any OK
     * @throws ApiError
     */
    public static deleteEndpoint(
        slug: string,
        projectId: number,
        endpointId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/tenants/{slug}/projects/{projectId}/endpoints/{endpointId}',
            path: {
                'slug': slug,
                'projectId': projectId,
                'endpointId': endpointId,
            },
        });
    }
}
