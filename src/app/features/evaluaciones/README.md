# Evaluaciones Dinamicas (MVP Front)

## Rutas

### Admin
- `/evaluaciones/admin/preguntas`
- `/evaluaciones/admin/secciones`
- `/evaluaciones/admin/cuestionarios`
- `/evaluaciones/admin/certificaciones`
- `/evaluaciones/admin/asignaciones`

### Usuario
- `/evaluaciones/usuario/mis-evaluaciones`
- `/evaluaciones/usuario/resolver/:assignmentId`
- `/evaluaciones/usuario/resultado/:attemptId`

## Persistencia localStorage

Se usan estas keys:
- `dynEval.questions.v1`
- `dynEval.sections.v1`
- `dynEval.questionnaires.v1`
- `dynEval.certifications.v1`
- `dynEval.assignments.v1`
- `dynEval.attempts.v1`
- `dynEval.session.v1`

## Asignaciones del MVP

Para simplificar el flujo, las asignaciones se hacen **directamente al cuestionario** (`assignment.questionnaireId`).

## Seed demo y reset

- `seedDemoData()` corre automaticamente al cargar el repositorio si las keys estan vacias.
- En **Admin > Publicacion / Asignaciones** hay un boton **Reset demo** que ejecuta `resetDemoData()`.

## Sesion mock

Se incluye `MockSessionService` con `role` y `currentUserId` persistidos en `dynEval.session.v1`.
Desde el header puedes cambiar:
- Rol: `ADMIN | USUARIO`
- Usuario dummy: `user1 | user2`
