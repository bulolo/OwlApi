/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type UpdateDataSourceRequest = {
    name?: string;
    env?: UpdateDataSourceRequest.env;
    type?: UpdateDataSourceRequest.type;
    dsn?: string;
    gateway_id?: number;
};
export namespace UpdateDataSourceRequest {
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

