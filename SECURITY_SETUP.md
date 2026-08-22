# Guía de configuración de seguridad — Snyk y SonarCloud

Este documento explica cómo habilitar los análisis de seguridad del pipeline CI
(job `security-analysis` de `.github/workflows/ci.yml`). Las credenciales se
configuran **exclusivamente como secrets de GitHub**: nunca en el código, ni en
el YAML, ni en `sonar-project.properties`.

## Resumen de herramientas

| Herramienta | Qué analiza | Secret requerido | Ejecución |
|-------------|-------------|------------------|-----------|
| npm audit | Vulnerabilidades conocidas en dependencias npm | Ninguno (usa el registry público) | **Siempre** |
| Snyk | Dependencias con vulnerabilidades a partir de severidad high | `SNYK_TOKEN` | Solo si el secret existe |
| SonarQube/SonarCloud | Calidad estática del código + Quality Gate (bugs, code smells, hotspots) | `SONAR_TOKEN` (`SONAR_HOST_URL` opcional) | Solo si el secret existe |

## Paso 1 — Obtener token gratuito de Snyk y configurarlo

1. Crear una cuenta gratuita en <https://snyk.io> (plan Free: suficiente para
   proyectos open source; permite tests ilimitados de repos públicos).
2. Iniciar sesión y abrir **Account Settings** (avatar → *Account settings*).
3. En la sección **API Token**, pulsar **Key: display** y copiar el token.
4. En GitHub, ir al repositorio → **Settings** → **Secrets and variables** →
   **Actions**.
5. Pulsar **New repository secret**:
   - *Name*: `SNYK_TOKEN`
   - *Secret*: pegar el token copiado
6. Guardar. El próximo push o PR ejecutará el paso `Análisis de dependencias
   con Snyk`.

## Paso 2 — Crear organización en SonarCloud e importar el repo

1. Entrar en <https://sonarcloud.io> con **Sign in with GitHub** (autorizar la
   app de SonarCloud en la cuenta de GitHub).
2. Si es la primera vez, pulsar **Create Organization** y elegir importar la
   organización desde GitHub (usar el *GitHub slug* del usuario u org que
   contiene el repo).
3. Dentro de la organización: **Add Project** → **Analyze new project** →
   **With GitHub Actions** → seleccionar `laboratorio-devops`.
4. SonarCloud mostrará los valores para el análisis. Verificar que
   `sonar-project.properties` del repo coincide:
   - `sonar.projectKey=laboratorio-devops`
5. Desactivar el **Automatic Analysis** del proyecto (*Administration →
   Analysis Method*) para que no entre en conflicto con el análisis del CI.
6. Generar el token: avatar → **My Account** → **Security** → *Generate Tokens*
   → copiar el valor.
7. En GitHub: **Settings** → **Secrets and variables** → **Actions** →
   **New repository secret**:
   - *Name*: `SONAR_TOKEN`
   - *Secret*: pegar el token generado

El host es opcional: si no se define el secret `SONAR_HOST_URL`, el pipeline
usa por defecto `https://sonarcloud.io`. Para un servidor SonarQube propio,
crear el secret `SONAR_HOST_URL` con la URL del servidor.

## Dónde ver los resultados

| Análisis | Resultado visible en |
|----------|----------------------|
| npm audit | Artefacto `security-reports` de la ejecución (`npm-audit.json`) y log del paso |
| Snyk | Log del paso, artefacto `security-reports` (`snyk-deps.json`) y dashboard <https://app.snyk.io> |
| SonarQube/SonarCloud | Quality Gate impreso en el log del paso + dashboard del proyecto en <https://sonarcloud.io> |
| Resumen conjunto | Pestaña **Summary** de la ejecución del workflow (job summary) al final del job |

## Comportamiento con y sin secrets

Los tres pasos usan `continue-on-error: true` y los pasos externos solo corren
si su secret existe. Así, un hallazgo de seguridad o un secret ausente **no
rompe el CI** (decisión justificada en comentarios del propio workflow), pero
el resumen final siempre indica qué se ejecutó y qué se saltó.

| Secrets configurados | npm audit | Snyk | SonarCloud | Resultado en job summary |
|----------------------|-----------|------|------------|--------------------------|
| Ninguno | corre | omitido (::warning::) | omitido (::warning::) | 1 ejecutado, 2 omitidos |
| Solo `SNYK_TOKEN` | corre | corre | omitido (::warning::) | 2 ejecutados, 1 omitido |
| Solo `SONAR_TOKEN` | corre | omitido (::warning::) | corre | 2 ejecutados, 1 omitido |
| Ambos | corre | corre | corre | 3 ejecutados |

## Evidencia y decisión sobre `.gitignore`

El directorio `security-reports/` está excluido en `.gitignore`: los reportes
se generan en cada ejecución del CI y se conservan como **artefacto de la
ejecución en GitHub Actions** (descargables desde la pestaña *Artifacts*).
Versionarlos duplicaría evidencia efímera y ensuciaría el historial git. El
informe de seguridad (feature 20) citará estos artefactos como fuente.

## Referencias

- Configuración general de credenciales: `docs/configuration.md`.
- Arquitectura de los pipelines: `docs/architecture.md`.
- Workflow donde se integran: `.github/workflows/ci.yml` (job `security-analysis`).
