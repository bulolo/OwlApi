/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type Tenant = {
    id?: number;
    name?: string;
    slug?: string;
    plan?: Tenant.plan;
    status?: Tenant.status;
    created_at?: string;
    updated_at?: string;
};
export namespace Tenant {
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

