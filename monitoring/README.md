# Monitoreo — Prometheus + Grafana

Stack de observabilidad del laboratorio DevOps. Prometheus scrapea el endpoint
`/metrics` de la aplicacion (expuesto con `prom-client`, ver feature 17) y Grafana
visualiza las metricas con provisioning automatico (datasource y dashboard sin
configuracion manual).

## Levantar el stack

Desde el directorio `monitoring/`:

```bash
docker compose -f docker-compose.monitoring.yml up -d --build
```

Esto levanta tres contenedores en una red bridge interna:

| Servicio   | Imagen                    | Puerto local | Descripcion                          |
|------------|---------------------------|--------------|--------------------------------------|
| app        | build del Dockerfile      | 3000         | Aplicacion Express (`/metrics`)      |
| prometheus | prom/prometheus:v2.53.0   | 9090         | Scrape cada 10s + reglas de alerta   |
| grafana    | grafana/grafana:11.1.0    | 3001         | Visualizacion (datasource provisionado) |

Prometheus depende de `app` (`depends_on`), por lo que arranca despues.

## URLs

- **App**: <http://localhost:3000> (metricas en <http://localhost:3000/metrics>)
- **Prometheus**: <http://localhost:9090>
- **Grafana**: <http://localhost:3001> — usuario `admin`, contrasena `admin`

## Ver el dashboard

1. Abrir <http://localhost:3001> e iniciar sesion (`admin` / `admin`).
2. Menu lateral: **Dashboards** -> carpeta **Laboratorio DevOps** ->
   dashboard **Laboratorio DevOps**.
3. El datasource **Prometheus** ya esta provisionado
   (`grafana/provisioning/datasources/prometheus.yml`) y el dashboard se carga
   desde `grafana/dashboards/` via `grafana/provisioning/dashboards/provider.yml`.

El dashboard incluye 5 paneles:

- **Estado de la app** (stat): `up{job="app"}` — verde si responde, rojo si caida.
- **CPU proceso** (timeseries): `rate(process_cpu_seconds_total[1m])`.
- **Memoria proceso** (timeseries): `process_resident_memory_bytes`.
- **Peticiones/s por ruta** (timeseries): `sum by (route) (rate(http_requests_total[1m]))`.
- **Peticiones/s por codigo** (timeseries): `sum by (status_code) (rate(http_requests_total[1m]))`.

Refresco automatico cada 10s, ventana inicial de 15 minutos.

## Ver la alerta

La alerta `InstanceDown` esta definida en `alerts.yml` (grupo `app-alerts`):
se dispara si `up == 0` durante mas de 1 minuto, con severidad `critical`.

1. Abrir <http://localhost:9090/alerts>.
2. Estado normal: `Inactive`. Para probarla, parar el contenedor de la app:
   `docker compose -f docker-compose.monitoring.yml stop app`.
3. Tras ~1 minuto la alerta pasa a `Firing` (rojo) con su descripcion en espanol.
4. Recuperar con `docker compose -f docker-compose.monitoring.yml start app`.

Tambien puede validarse la expresion en <http://localhost:9090/query> con `up`.

## Parar el stack

```bash
docker compose -f docker-compose.monitoring.yml down
```

Anade `-v` solo si ademas quieres eliminar los volumenes (Grafana guarda su
estado en `/var/lib/grafana`, aqui montado desde el directorio `dashboards/`).

## Estructura

```
monitoring/
├── docker-compose.monitoring.yml          # Stack completo (app + prometheus + grafana)
├── prometheus.yml                         # Config de Prometheus (scrape 10s, job "app")
├── alerts.yml                             # Regla InstanceDown (severity critical)
├── grafana/
│   ├── provisioning/
│   │   ├── datasources/prometheus.yml     # Datasource Prometheus (uid prometheus)
│   │   └── dashboards/provider.yml        # Provider de dashboards desde fichero
│   └── dashboards/
│       └── laboratorio-devops.json        # Dashboard con 5 paneles
└── README.md                              # Esta guia
```
