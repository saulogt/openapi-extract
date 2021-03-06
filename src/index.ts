import express, { RequestHandler, IRouter, Router, Express } from 'express';

import * as t from 'io-ts';
import { isLeft } from 'fp-ts/lib/Either';

import { PathItem, Spec, Context, PathObj, Operation } from './swaggerTypes';

type OperationObjectParams<P extends t.Any = t.Any> = {
  params?: P;
};

type OperationObjectReqBody<P extends t.Any = t.Any> = {
  body?: P;
};
type OperationObjectResBody<P extends t.Any = t.Any> = {
  resp?: P;
};
type OperationObjectQuery<P extends t.Any = t.Any> = {
  query?: P;
};

type OperationObject<
  P extends t.Any = t.Any,
  RS extends t.Any = t.Any,
  RQ extends t.Any = t.Any,
  Q extends t.Any = t.Any
> = OperationObjectParams<P> &
  OperationObjectReqBody<RQ> &
  OperationObjectResBody<RS> &
  OperationObjectQuery<Q> & {
    description?: string;
  };

type ExpressWrapper<T extends IRouter> = Context<T>;

interface IOverload {
  <
    Route extends string,
    P extends t.Any,
    RS extends t.Any,
    RQ extends t.Any,
    Q extends t.Any
  >(
    route: Route,
    op: OperationObject<P, RS, RQ, Q>,
    handler: RequestHandler<
      t.TypeOf<P>,
      t.TypeOf<RS>,
      t.TypeOf<RQ>,
      t.TypeOf<Q>
    >
  ): void;

  <Route extends string>(route: Route, handler: RequestHandler): void;
}

const mkHandler =
  <
    T extends IRouter,
    Method extends
      | 'all'
      | 'get'
      | 'post'
      | 'put'
      | 'delete'
      | 'patch'
      | 'options'
      | 'head'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      | 'trace' = any
  >(
    expressWrapper: ExpressWrapper<T>,
    method: Method
  ): IOverload =>
  <
    Route extends string,
    P extends t.Any = t.Any,
    RS extends t.Any = t.Any,
    RQ extends t.Any = t.Any,
    Q extends t.Any = t.Any
  >(
    route: Route,
    opOrHandler:
      | OperationObject<P, RS, RQ, Q>
      | RequestHandler<t.TypeOf<P>, t.TypeOf<RS>, t.TypeOf<RQ>, t.TypeOf<Q>>,
    handler?: RequestHandler<
      t.TypeOf<P>,
      t.TypeOf<RS>,
      t.TypeOf<RQ>,
      t.TypeOf<Q>
    >
  ) => {
    const _handler = handler || (opOrHandler as NonNullable<typeof handler>);
    const op = opOrHandler as OperationObject<P, RS, RQ, Q>;

    expressWrapper.swagger.paths = expressWrapper.swagger.paths || [];

    expressWrapper.swagger.paths.push({
      path: route,
      item: {
        [method]: {
          description: op.description || '',
          validation: {
            body: op.body,
            params: op.params,
            query: op.query,
            resp: op.resp,
          },
        },
      },
    });

    const paramsDecoder = op.params;
    const bodyDecoder = op.body;

    expressWrapper.getExpress()[method](
      route,
      (req, res, next) => {
        console.log(req.params);

        const paramDecoded = paramsDecoder?.decode(req.params);
        if (paramDecoded && isLeft(paramDecoded)) {
          res.status(400).send(paramDecoded.left as any);
          return;
        }

        const bodyDecoded = bodyDecoder?.decode(req.body);
        if (bodyDecoded && isLeft(bodyDecoded)) {
          res.status(400).send(bodyDecoded.left as any);
          return;
        }

        next();
      },
      _handler
    );
  };

const isSwaggerRouter = (obj: unknown): obj is SwaggerRouter => {
  if (typeof (obj as { getContext?: unknown }).getContext === 'function') {
    return true;
  }
  return false;
};

const mkUse =
  <T extends IRouter>(expressWrapper: ExpressWrapper<T>) =>
  <Route extends string>(
    route: Route,
    handler: RequestHandler | SwaggerRouter
  ) => {
    if (isSwaggerRouter(handler)) {
      const swaggerRouter = handler;

      const routerContext = swaggerRouter.getContext();

      expressWrapper.swagger.paths = expressWrapper.swagger.paths || [];

      expressWrapper.swagger.paths.push({
        path: route,
        item: { router: routerContext },
      });

      expressWrapper.getExpress().use(route, routerContext.getExpress());
    } else {
      expressWrapper.getExpress().use(route, handler);
    }
  };

export const swaggerApp = (spec: Spec) => (_app?: Express) => {
  const app = _app || express();

  const context: Context = {
    getExpress: () => app,
    prefix: '/',
    spec,
    swagger: { paths: [] },
  };

  const listen = (port: number, callback?: () => void) => {
    app.listen(port, callback);
  };

  return {
    all: mkHandler(context, 'all'),
    get: mkHandler(context, 'get'),
    post: mkHandler(context, 'post'),
    put: mkHandler(context, 'put'),
    delete: mkHandler(context, 'delete'),
    patch: mkHandler(context, 'patch'),
    options: mkHandler(context, 'options'),
    head: mkHandler(context, 'head'),
    use: mkUse(context),

    documentation: (options?: { route?: string }) => {
      app.get(options?.route || 'swagger', (_req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader(
          'Access-Control-Allow-Methods',
          'GET, POST, OPTIONS, PUT, PATCH, DELETE'
        ); // If needed
        res.setHeader(
          'Access-Control-Allow-Headers',
          'X-Requested-With,content-type'
        ); // If needed

        const ret = {
          openapi: '3.0.3',
          title: spec.info.title,
          description: spec.info.description,
          contact: spec.info.contact,
          license: spec.info.license,

          paths: extractPaths(context),
        };

        res.send(ret);
      });
    },

    listen,
  };
};

interface SwaggerRouter {
  getContext: () => Context<express.Router>;
  all: IOverload;
  get: IOverload;
  post: IOverload;
  put: IOverload;
  delete: IOverload;
  patch: IOverload;
  options: IOverload;
  head: IOverload;
  use: <Route extends string>(
    route: Route,
    handler: RequestHandler | SwaggerRouter
  ) => void;
}

export const swaggerRouter = (_app?: Router): SwaggerRouter => {
  const app = _app || Router();

  const context: Context<Router> = {
    getExpress: () => app,
    prefix: '/',
    swagger: { paths: [] },
  };

  return {
    getContext: () => context,
    all: mkHandler(context, 'all'),
    get: mkHandler(context, 'get'),
    post: mkHandler(context, 'post'),
    put: mkHandler(context, 'put'),
    delete: mkHandler(context, 'delete'),
    patch: mkHandler(context, 'patch'),
    options: mkHandler(context, 'options'),
    head: mkHandler(context, 'head'),
    use: mkUse(context),
  };
};

function extractPaths(context: Context) {
  const doIt = (paths: PathObj[], prefix = '/') =>
    paths.reduce((p, { path, item }) => {
      const { router, ..._v } = item;

      const fullPath = joinPaths(prefix, path);
      p[fullPath] = { ...p[fullPath], ..._v };

      Object.entries(p[fullPath]).forEach(([k, v]) => {
        if (
          [
            'all',
            'get',
            'post',
            'put',
            'delete',
            'patch',
            'options',
            'head',
          ].includes(k)
        ) {
          // Workarround the type checker
          const o = p[fullPath][k as 'get'] as Operation;
          const b = extractType(o.validation?.body);
          console.log(b);

          o.tags = [...(o.tags || []), prefix];
        }
      });

      if (router) {
        Object.entries(doIt(router.swagger.paths, fullPath)).forEach(
          ([k, v]) => {
            p[k] = { ...p[k], ...v };
          }
        );
      }

      return p;
    }, {} as Record<string, PathItem>);

  return doIt(context.swagger.paths);
}

const joinPaths = (path1: string, path2: string) => {
  if (!path1.endsWith('/')) {
    path1 += '/';
  }
  if (path2.startsWith('/')) {
    path2 = path2.substring(1);
  }
  return path1 + path2;
};

// Extract json type from io-ts opject
const extractType = (tp?: t.Any): any => {
  if (!tp) return;

  // tp.encode()
  // const isit = t.exact(tp as any);

  // if (t.name === 'Intersection') {
  //   return t.types.map(extractType).join(' & ');
  // }
  // if (t.name === 'Union') {
  //   return t.types.map(extractType).join(' | ');
  // }
  // if (t.name === 'Nullable') {
  //   return extractType(t.type).replace(' | null', '');
  // }
  // if (t.name === 'Array') {
  //   return `Array<${extractType(t.type)}>`;
  // }
  // if (t.name === 'StringLiteral') {
  //   return t.value;
  // }
  // if (t.name === 'NumberLiteral') {
  //   return t.value;
  // }
  // if (t.name === 'BooleanLiteral') {
  //   return t.value;
  // }
  // if (t.name === 'Literal') {
  //   return t.value;
  // }
  // if (t.name === 'TypeParameter') {
  //   return t.name;
  // }
  // if (t.name === 'UnknownRecord') {
  //   return 'any';
  // }
  // if (t.name === 'UnknownArray') {
  //   return 'any[]';
  // }
  // if (t.name === 'Unknown') {
  //   return 'any';
  // }
  // if (t.name === 'Null') {
  //   return 'null';
  // }
  // if (t.name === 'Undefined') {
  //   return 'undefined';
  // }
  // if (t.name === 'Never') {
  //   return 'never';
  // }
  // if (t.name === 'UnknownString') {
  //   return 'string';
  // }
  // if (t.name === 'UnknownNumber') {
  //   return 'number';
  // }
  // if (t.name === 'UnknownBoolean') {
  //   return 'boolean';
  // }
  // if (t.name === 'UnknownFunction') {
  //   return 'Function';
};
