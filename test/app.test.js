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

    // /metrics: formato Prometheus con metricas de proceso y contador HTTP.
    // Se pega primero a /healthz para que el contador registre trafico real.
    test('El endpoint /metrics debe exponer metricas Prometheus tras trafico previo', async () => {
        const salud = await request(app).get('/healthz');
        expect(salud.statusCode).toBe(200);

        const response = await request(app).get('/metrics');

        expect(response.statusCode).toBe(200);
        expect(response.headers['content-type']).toContain('text/plain');
        expect(response.headers['content-type']).toContain('version=0.0.4');
        expect(response.text).toContain('http_requests_total');
        expect(response.text).toContain('process_cpu_seconds_total');
    });

});