const express = require('express');
const promClient = require('prom-client');

const app = express();
const PORT = process.env.PORT || 3000;

// Registro propio de Prometheus (aislado del registro global) y metricas
// por defecto del proceso Node (CPU, memoria, event loop, GC, etc.).
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

// Contador de peticiones HTTP. La label "route" se normaliza para acotar
// la cardinalidad: rutas declaradas, 'static' o 'unmatched'.
const httpRequestsTotal = new promClient.Counter({
    name: 'http_requests_total',
    help: 'Numero total de peticiones HTTP recibidas por metodo, ruta y codigo de estado.',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register],
});

// Normaliza la etiqueta route para evitar alta cardinalidad en Prometheus:
// - Rutas declaradas: req.route.path ('/healthz', '/metrics').
// - Servidas por express.static: no definen req.route -> 'static'.
// - No servidas por nada (404): marcadas por el middleware final -> 'unmatched'.
function resolverRoute(req) {
    if (req.route && req.route.path) {
        return req.route.path;
    }
    if (req.sinRuta) {
        return 'unmatched';
    }
    return 'static';
}

// Middleware de metricas: registra el incremento al terminar cada respuesta,
// de modo que tambien captura 404s y respuestas emitidas por express.static.
app.use((req, res, next) => {
    res.on('finish', () => {
        httpRequestsTotal
            .labels(req.method, resolverRoute(req), String(res.statusCode))
            .inc();
    });
    next();
});

app.use(express.static('public'));

// Endpoint de salud consumido por las probes de k8s/deployment.yml.
app.get('/healthz', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// Endpoint de metricas en formato Prometheus (text/plain; version=0.0.4).
app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
});

// Middleware final: todo lo que llega aqui no fue servido ni por static ni
// por ninguna ruta declarada; se marca como 'unmatched' antes del 404.
app.use((req, res, next) => {
    req.sinRuta = true;
    next();
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
    });
}

module.exports = app;