import { IRouter } from 'express';
import * as t from 'io-ts';

export interface Spec {
  info: {
    title: string;
    description?: string;
    termsOfService?: string;
    contact?: {
      name: string;
      url: string;
      email: string;
    };
    license?: {
      name: string;
      url?: string;
    };
    version: string;
  };
  servers?: [];
  // paths:
}

export interface PathObj {
  path: string;
  item: PathItem;
}

export interface Context<T extends IRouter = IRouter> {
  getExpress: () => T;
  spec?: Spec;
  prefix: string;
  swagger: { paths: PathObj[] };
}

export interface PathItem {
  summary?: string;
  description?: string;
  get?: Operation;
  put?: Operation;
  post?: Operation;
  delete?: Operation;
  options?: Operation;
  head?: Operation;
  patch?: Operation;
  trace?: Operation;
  // servers?:	[ServerObject],
  // parameters?:	[ParameterObject],

  router?: Context;
}

type ParameterObject = {
  name: string;
  description?: string;
  deprecated?: boolean;
} & (
  | {
      in: 'path';
      required: true;
    }
  | {
      in: 'query' | 'header' | 'cookie';
      required?: boolean;
    }
);

interface RequestBody {
  description?: string;
  required?: boolean;
  content: Record<
    string,
    {
      schema: {
        type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';
      };
    }
  >;
}

interface ResponseObject {
  description: string;
  headers?: Record<
    string,
    {
      /// https://swagger.io/specification/#header-object
      description?: string;
    }
  >;
}

export interface Operation {
  tags?: string[];
  summary?: string;
  description?: string;
  operationId?: string;
  parameters?: ParameterObject[];
  requestBody?: RequestBody;
  responses?: ResponseObject[];
  // security?:	Security[],

  validation?: {
    body?: t.Any;
    query?: t.Any;
    params?: t.Any;
    resp?: t.Any;
  };
}
