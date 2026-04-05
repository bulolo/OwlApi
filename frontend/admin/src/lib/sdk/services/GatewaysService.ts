/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CreateGatewayRequest } from '../models/CreateGatewayRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class GatewaysService {
    /**
     * 网关节点列表
     * @param slug
     * @returns any OK
     * @throws ApiError
     */
    public static listGateways(
        slug: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/tenants/{slug}/gateways',
            path: {
                'slug': slug,
            },
        });
    }
    /**
     * 创建网关节点
     * @param slug
     * @param requestBody
     * @returns any OK
     * @throws ApiError
     */
    public static createGateway(
        slug: string,
        requestBody: CreateGatewayRequest,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/tenants/{slug}/gateways',
            path: {
                'slug': slug,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 获取网关节点详情
     * @param slug
     * @param gatewayId
     * @returns any OK
     * @throws ApiError
     */
    public static getGateway(
        slug: string,
        gatewayId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/tenants/{slug}/gateways/{gatewayId}',
            path: {
                'slug': slug,
                'gatewayId': gatewayId,
            },
        });
    }
    /**
     * 删除网关节点
     * @param slug
     * @param gatewayId
     * @returns any OK
     * @throws ApiError
     */
    public static deleteGateway(
        slug: string,
        gatewayId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/tenants/{slug}/gateways/{gatewayId}',
            path: {
                'slug': slug,
                'gatewayId': gatewayId,
            },
        });
    }
}
