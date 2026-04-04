/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type UpdateTenantRequest = {
    name?: string;
    plan?: UpdateTenantRequest.plan;
    status?: UpdateTenantRequest.status;
};
export namespace UpdateTenantRequest {
    export enum plan {
        FREE = 'Free',
        PRO = 'Pro',
        ENTERPRISE = 'Enterprise',
    }
    export enum status {
        ACTIVE = 'Active',
        WARNING = 'Warning',
        SUSPENDED = 'Suspended',
    }
}

