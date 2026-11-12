# Certum360 Expediente

[Español](#español) · [English](#english)

## Español

Certum360 Expediente es un prototipo web para gestionar expedientes de proveedores y dar seguimiento a sus evaluaciones. La interfaz está desarrollada con Angular 21, TypeScript y Tailwind CSS 4, a partir de la [plantilla Angular de TailAdmin](https://github.com/TailAdmin/free-angular-tailwind-dashboard).

### Recorrido por la demo

1. **Expedientes.** En `/expediente/proveedores` puedes consultar un proveedor, abrir las fichas de las personas asociadas y revisar su plantilla de expediente. En `/expediente/revision` encontrarás la vista de revisión.
2. **Preparación de evaluaciones.** En la vista de administración puedes crear preguntas, agruparlas en secciones, preparar un cuestionario y asignarlo.
3. **Resolución y resultados.** Desde `/evaluaciones/usuario/mis-evaluaciones`, el usuario puede abrir un cuestionario asignado, responderlo y consultar el resultado. La [guía del módulo de evaluaciones](src/app/features/evaluaciones/README.md) detalla las rutas y cómo restablecer los datos de ejemplo.

La demo simula las sesiones y guarda datos de expedientes y evaluaciones en el navegador mediante `localStorage`. Usa datos ficticios al probar estos flujos.

### Desarrollo local

Con Node.js 22.12 o una versión posterior de la serie 22 y npm instalados, ejecuta estos comandos desde la raíz del repositorio:

```sh
npm ci
npm start
```

Abre [localhost:4200](http://localhost:4200/). Para generar la compilación de producción, ejecuta `npm run build`.

## English

Certum360 Expediente is a web prototype for managing supplier records and tracking assessments. The interface uses Angular 21, TypeScript, and Tailwind CSS 4 and is based on the [TailAdmin Angular template](https://github.com/TailAdmin/free-angular-tailwind-dashboard).

### Demo walkthrough

1. **Supplier records.** At `/expediente/proveedores`, you can open a supplier record, view the people associated with it, and inspect its record template. Open `/expediente/revision` for the review screen.
2. **Assessment setup.** In the admin view, you can create questions, group them into sections, build a questionnaire, and assign it.
3. **Responses and results.** At `/evaluaciones/usuario/mis-evaluaciones`, users can open an assigned questionnaire, submit their answers, and view the result. The [assessment module guide (in Spanish)](src/app/features/evaluaciones/README.md) lists the routes and explains how to reset the sample data.

The demo simulates user sessions and saves supplier record and assessment data in the browser using `localStorage`. Use fictional data when trying these workflows.

### Local development

Install Node.js 22.12 or a later 22.x release and npm, then run these commands from the repository root:

```sh
npm ci
npm start
```

Open [localhost:4200](http://localhost:4200/). To create a production build, run `npm run build`.
