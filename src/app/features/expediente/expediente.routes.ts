import { Routes } from "@angular/router";

export const expedienteRoutes: Routes = [
  {
    path: "",
    redirectTo: "dashboard",
    pathMatch: "full",
  },
  {
    path: "dashboard",
    loadComponent: () =>
      import("./pages/dashboard-expediente/dashboard-expediente.component").then(
        (m) => m.DashboardExpedienteComponent,
      ),
    title: "Dashboard Expediente",
  },
  {
    path: "revision",
    loadComponent: () =>
      import("./pages/revision-expedientes/revision-expedientes.component").then(
        (m) => m.RevisionExpedientesComponent,
      ),
    title: "Expediente - Revision de expedientes",
  },
  {
    path: "proveedores",
    loadComponent: () =>
      import("./pages/proveedores-expediente/proveedores-expediente.component").then(
        (m) => m.ProveedoresExpedienteComponent,
      ),
    title: "Expediente - Proveedores",
  },
  {
    path: "proveedores/nuevo",
    loadComponent: () =>
      import("./pages/proveedor-form-expediente/proveedor-form-expediente.component").then(
        (m) => m.ProveedorFormExpedienteComponent,
      ),
    title: "Expediente - Alta de proveedor",
  },
  {
    path: "proveedores/:id/editar",
    loadComponent: () =>
      import("./pages/proveedor-form-expediente/proveedor-form-expediente.component").then(
        (m) => m.ProveedorFormExpedienteComponent,
      ),
    title: "Expediente - Edicion de proveedor",
  },
  {
    path: "proveedores/:id/plantilla",
    loadComponent: () =>
      import("./pages/proveedor-plantilla-expediente/proveedor-plantilla-expediente.component").then(
        (m) => m.ProveedorPlantillaExpedienteComponent,
      ),
    title: "Expediente - Configuracion de plantilla",
  },
  {
    path: "proveedores/:id/personas/:personId",
    loadComponent: () =>
      import("./pages/persona-detalle-expediente/persona-detalle-expediente.component").then(
        (m) => m.PersonaDetalleExpedienteComponent,
      ),
    title: "Expediente - Detalle de expediente",
  },
  {
    path: "proveedores/:id",
    loadComponent: () =>
      import("./pages/proveedor-detalle-expediente/proveedor-detalle-expediente.component").then(
        (m) => m.ProveedorDetalleExpedienteComponent,
      ),
    title: "Expediente - Detalle de proveedor",
  },
];
