import express from 'express';
import { swaggerApp, swaggerRouter } from '../src/index';
import * as t from 'io-ts';

const xApp = express();

const r = express.Router();
xApp.get('/', r);

const app = swaggerApp({ info: { title: 'My API', version: '1.0.0' } })(xApp);

// app.get('/', (req, res) => {
//   console.log(req.params);

//   res.send({ a: 1 });
// });

app.post('/pet', { description: 'Add a new pet to the store' }, (req, res) => {
  console.log(req.params);

  res.send({ a: 1 });
});

app.post(
  '/pet/:petId/uploadImage',
  { description: 'Add a new pet to the store' },
  (req, res) => {
    console.log(req.params);

    res.send({ a: 1 });
  }
);

app.put('/pet', { description: 'Update an existing pet' }, (req, res) => {
  console.log(req.params);

  res.send({ a: 1 });
});

app.get('/pet/findByStatus', { description: 'Find by status' }, (req, res) => {
  console.log(req.params);

  res.send({ a: 1 });
});

app.all('/all', (_req, res) => {
  res.send('all');
});

app.delete('/pet/:id', (_req, res) => {
  res.send('delete');
});

const storeRouter = swaggerRouter(express.Router());

storeRouter.get('/order/:orderId', (_req, res) => {
  res.send('store');
});

storeRouter.post('/order', (_req, res) => {
  res.send('store');
});

storeRouter.delete('/order/:orderId', {}, (_req, res) => {
  res.send('store');
});

storeRouter.get('/inventory', (_req, res) => {
  res.send('store');
});

const employeeRouter = swaggerRouter();

storeRouter.use('/employee', employeeRouter);

employeeRouter.get('/:employeeId', (_req, res) => {
  res.send('employee');
});

storeRouter;

app.use('/store', storeRouter);

app.listen(3000, () => {
  console.log('Example app listening on port 3000!');
});

app.documentation({ route: '/swagger.json' });
