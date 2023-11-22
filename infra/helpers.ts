import * as pulumi from "@pulumi/pulumi";

const stack = pulumi.getStack();

const config = new pulumi.Config();

export const nm = (name: string) => `${name}-pl-${stack}`;
