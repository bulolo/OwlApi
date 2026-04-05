/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type DataSource = {
    id?: number;
    tenant_id?: number;
    gateway_id?: number;
    name?: string;
    env?: DataSource.env;
    type?: DataSource.type;
    created_at?: string;
};
export namespace DataSource {
    export enum env {
        DEV = 'dev',
        PROD = 'prod',
    }
    export enum type {
        MYSQL = 'mysql',
        POSTGRES = 'postgres',
        SQLSERVER = 'sqlserver',
        STARROCKS = 'starrocks',
        DORIS = 'doris',
        SQLITE = 'sqlite',
    }
}

