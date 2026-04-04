/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type AddUserRequest = {
    email: string;
    name: string;
    password: string;
    role: AddUserRequest.role;
};
export namespace AddUserRequest {
    export enum role {
        ADMIN = 'Admin',
        VIEWER = 'Viewer',
    }
}

