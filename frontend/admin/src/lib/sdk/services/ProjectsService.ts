/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CreateProjectRequest } from '../models/CreateProjectRequest';
import type { UpdateProjectRequest } from '../models/UpdateProjectRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ProjectsService {
    /**
     * 项目列表
     * @param slug
     * @returns any OK
     * @throws ApiError
     */
    public static listProjects(
        slug: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/tenants/{slug}/projects',
            path: {
                'slug': slug,
            },
        });
    }
    /**
     * 创建项目
     * @param slug
     * @param requestBody
     * @returns any OK
     * @throws ApiError
     */
    public static createProject(
        slug: string,
        requestBody: CreateProjectRequest,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/tenants/{slug}/projects',
            path: {
                'slug': slug,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 获取项目详情
     * @param slug
     * @param projectId
     * @returns any OK
     * @throws ApiError
     */
    public static getProject(
        slug: string,
        projectId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/tenants/{slug}/projects/{projectId}',
            path: {
                'slug': slug,
                'projectId': projectId,
            },
        });
    }
    /**
     * 编辑项目
     * @param slug
     * @param projectId
     * @param requestBody
     * @returns any OK
     * @throws ApiError
     */
    public static updateProject(
        slug: string,
        projectId: number,
        requestBody: UpdateProjectRequest,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/tenants/{slug}/projects/{projectId}',
            path: {
                'slug': slug,
                'projectId': projectId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 删除项目
     * @param slug
     * @param projectId
     * @returns any OK
     * @throws ApiError
     */
    public static deleteProject(
        slug: string,
        projectId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/tenants/{slug}/projects/{projectId}',
            path: {
                'slug': slug,
                'projectId': projectId,
            },
        });
    }
}
