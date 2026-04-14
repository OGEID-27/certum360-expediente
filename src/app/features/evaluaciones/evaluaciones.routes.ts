import { Routes } from "@angular/router";
import { AdminAsignacionesComponent } from "./pages/admin-asignaciones/admin-asignaciones.component";
import { AdminAsignacionesFormComponent } from "./pages/admin-asignaciones-form/admin-asignaciones-form.component";
import { AdminCertificacionFormComponent } from "./pages/admin-certificacion-form/admin-certificacion-form.component";
import { AdminCertificacionPreviewComponent } from "./pages/admin-certificacion-preview/admin-certificacion-preview.component";
import { AdminCertificacionesComponent } from "./pages/admin-certificaciones/admin-certificaciones.component";
import { AdminCuestionarioFormComponent } from "./pages/admin-cuestionario-form/admin-cuestionario-form.component";
import { AdminCuestionariosComponent } from "./pages/admin-cuestionarios/admin-cuestionarios.component";
import { AdminPreguntaFormComponent } from "./pages/admin-pregunta-form/admin-pregunta-form.component";
import { AdminPreguntasComponent } from "./pages/admin-preguntas/admin-preguntas.component";
import { AdminSeccionFormComponent } from "./pages/admin-seccion-form/admin-seccion-form.component";
import { AdminSeccionesComponent } from "./pages/admin-secciones/admin-secciones.component";
import { UsuarioMisEvaluacionesComponent } from "./pages/usuario-mis-evaluaciones/usuario-mis-evaluaciones.component";
import { UsuarioEnvioConfirmacionComponent } from "./pages/usuario-envio-confirmacion/usuario-envio-confirmacion.component";
import { UsuarioResolverComponent } from "./pages/usuario-resolver/usuario-resolver.component";
import { UsuarioResultadoComponent } from "./pages/usuario-resultado/usuario-resultado.component";
import { AltaExpedienteComponent } from "./pages/alta-expediente/alta-expediente.component";

export const evaluacionesRoutes: Routes = [
  {
    path: "",
    redirectTo: "usuario/mis-evaluaciones",
    pathMatch: "full",
  },
  {
    path: "admin/preguntas/nueva",
    component: AdminPreguntaFormComponent,
    title: "Evaluaciones - Admin - Nueva Pregunta",
  },
  {
    path: "admin/preguntas/:id/editar",
    component: AdminPreguntaFormComponent,
    title: "Evaluaciones - Admin - Editar Pregunta",
  },
  {
    path: "admin/preguntas",
    component: AdminPreguntasComponent,
    title: "Evaluaciones - Admin - Banco de Preguntas",
  },
  {
    path: "admin/secciones/nueva",
    component: AdminSeccionFormComponent,
    title: "Evaluaciones - Admin - Nueva Seccion",
  },
  {
    path: "admin/secciones/:id/editar",
    component: AdminSeccionFormComponent,
    title: "Evaluaciones - Admin - Editar Seccion",
  },
  {
    path: "admin/secciones",
    component: AdminSeccionesComponent,
    title: "Evaluaciones - Admin - Secciones",
  },
  {
    path: "admin/cuestionarios/nuevo",
    component: AdminCuestionarioFormComponent,
    title: "Evaluaciones - Admin - Nuevo Cuestionario",
  },
  {
    path: "admin/cuestionarios/:id/editar",
    component: AdminCuestionarioFormComponent,
    title: "Evaluaciones - Admin - Editar Cuestionario",
  },
  {
    path: "admin/cuestionarios",
    component: AdminCuestionariosComponent,
    title: "Evaluaciones - Admin - Cuestionarios",
  },
  {
    path: "admin/certificaciones/nueva",
    component: AdminCertificacionFormComponent,
    title: "Evaluaciones - Admin - Nueva Certificacion",
  },
  {
    path: "admin/certificaciones/:id/editar",
    component: AdminCertificacionFormComponent,
    title: "Evaluaciones - Admin - Editar Certificacion",
  },
  {
    path: "admin/certificaciones/:id/preview",
    component: AdminCertificacionPreviewComponent,
    title: "Evaluaciones - Admin - Preview Certificacion",
  },
  {
    path: "admin/certificaciones",
    component: AdminCertificacionesComponent,
    title: "Evaluaciones - Admin - Certificaciones",
  },
  {
    path: "asignaciones/nueva",
    component: AdminAsignacionesFormComponent,
    title: "Evaluaciones - Asignaciones - Nueva",
  },
  {
    path: "asignaciones/:id/editar",
    component: AdminAsignacionesFormComponent,
    title: "Evaluaciones - Asignaciones - Editar",
  },
  {
    path: "admin/asignaciones",
    component: AdminAsignacionesComponent,
    title: "Evaluaciones - Asignaciones",
  },
  {
    path: "admin/alta-expediente",
    component: AltaExpedienteComponent,
    title: "Evaluaciones - Admin - Alta de Expediente",
  },
  {
    path: "usuario/mis-evaluaciones",
    component: UsuarioMisEvaluacionesComponent,
    title: "Evaluaciones - Usuario - Mis Evaluaciones",
  },
  {
    path: "usuario/alta-expediente",
    component: AltaExpedienteComponent,
    title: "Evaluaciones - Usuario - Alta de Expediente",
  },
  {
    path: "usuario/resolver/:assignmentId",
    component: UsuarioResolverComponent,
    title: "Evaluaciones - Usuario - Resolver",
  },
  {
    path: "usuario/envio/:attemptId",
    component: UsuarioEnvioConfirmacionComponent,
    title: "Evaluaciones - Usuario - Envio confirmado",
  },
  {
    path: "usuario/resultado/:attemptId",
    component: UsuarioResultadoComponent,
    title: "Evaluaciones - Usuario - Resultado",
  },
];
