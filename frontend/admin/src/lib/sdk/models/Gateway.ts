/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type Gateway = {
    id?: number;
    tenant_id?: number;
    name?: string;
    status?: Gateway.status;
    ip?: string;
    last_seen?: string;
    version?: string;
};
export namespace Gateway {
    export enum status {
        ONLINE = 'online',
        OFFLINE = 'offline',
    }
}

