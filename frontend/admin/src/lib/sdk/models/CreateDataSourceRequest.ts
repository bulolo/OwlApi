/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CreateDataSourceRequest = {
    name: string;
    env: CreateDataSourceRequest.env;
    type: CreateDataSourceRequest.type;
    dsn: string;
    gateway_id: number;
};
export namespace CreateDataSourceRequest {
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

