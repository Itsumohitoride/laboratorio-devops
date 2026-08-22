const request = require('supertest');
const app = require('../server');

describe('Pruebas de la aplicación Intellillent', () => {

    test('La página principal debe responder con código 200', async () => {
        const response = await request(app).get('/');

        expect(response.statusCode).toBe(200);
    });

    test('La página principal debe contener el nombre Intellillent', async () => {
        const response = await request(app).get('/');

        expect(response.text).toContain('Intellillent');
    });

    // /healthz: consumido por las probes de k8s/deployment.yml.
    test('El endpoint de salud /healthz debe responder con código 200', async () => {
        const response = await request(app).get('/healthz');

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({ status: 'ok' });
    });

});