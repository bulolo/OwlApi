/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CreateTenantRequest = {
    name: string;
    slug: string;
    plan?: CreateTenantRequest.plan;
    user_id: string;
};
export namespace CreateTenantRequest {
    export enum plan {
        FREE = 'Free',
        PRO = 'Pro',
        ENTERPRISE = 'Enterprise',
    }
}

