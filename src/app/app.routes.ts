import { Routes } from "@angular/router";
import { EcommerceComponent } from "./pages/dashboard/ecommerce/ecommerce.component";
import { ProfileComponent } from "./pages/profile/profile.component";
import { FormElementsComponent } from "./pages/forms/form-elements/form-elements.component";
import { BasicTablesComponent } from "./pages/tables/basic-tables/basic-tables.component";
import { BlankComponent } from "./pages/blank/blank.component";
import { NotFoundComponent } from "./pages/other-page/not-found/not-found.component";
import { AppLayoutComponent } from "./shared/layout/app-layout/app-layout.component";
import { InvoicesComponent } from "./pages/invoices/invoices.component";
import { LineChartComponent } from "./pages/charts/line-chart/line-chart.component";
import { BarChartComponent } from "./pages/charts/bar-chart/bar-chart.component";
import { AlertsComponent } from "./pages/ui-elements/alerts/alerts.component";
import { AvatarElementComponent } from "./pages/ui-elements/avatar-element/avatar-element.component";
import { BadgesComponent } from "./pages/ui-elements/badges/badges.component";
import { ButtonsComponent } from "./pages/ui-elements/buttons/buttons.component";
import { ImagesComponent } from "./pages/ui-elements/images/images.component";
import { VideosComponent } from "./pages/ui-elements/videos/videos.component";
import { SignInComponent } from "./pages/auth-pages/sign-in/sign-in.component";
import { SignUpComponent } from "./pages/auth-pages/sign-up/sign-up.component";
import { CalenderComponent } from "./pages/calender/calender.component";
import { AltaClientesComponent } from "./pages/alta-clientes/alta-clientes.component";
import { ClienteFormComponent } from "./pages/alta-clientes/cliente-form/cliente-form.component";
import { ClientEvaluationDetailComponent } from "./pages/alta-clientes/client-evaluation-detail/client-evaluation-detail.component";
import { ClientEvaluationsComponent } from "./pages/alta-clientes/client-evaluations/client-evaluations.component";
import { CalculadoraRiesgosComponent } from "./pages/calculadora-riesgos/calculadora-riesgos.component";
import { FirmaContratoComponent } from "./pages/firma-contrato/firma-contrato.component";
import { PlanRemediacionComponent } from "./pages/plan-remediacion/plan-remediacion.component";
import { SettingsComponent } from "./pages/settings/settings.component";
import { NotificacionesComponent } from "./pages/notificaciones/notificaciones.component";
import {
  loginRedirectGuard,
  roleAccessGuard,
} from "./core/guards/role-access.guard";
import { expedienteRoutes } from "./features/expediente/expediente.routes";
import { LoginAdminComponent } from "./pages/login/login-admin/login-admin.component";

export const routes: Routes = [
  {
    path: "",
    redirectTo: "/login-admin",
    pathMatch: "full",
  },
  {
    path: "",
    component: AppLayoutComponent,
    canActivate: [roleAccessGuard],
    data: {
      roles: ["admin", "user"],
    },
    children: [
      {
        path: "dashboard",
        component: EcommerceComponent,
        title:
          "Angular Ecommerce Dashboard | TailAdmin - Angular Admin Dashboard Template",
      },
      {
        path: "calendar",
        component: CalenderComponent,
        title:
          "Angular Calender | TailAdmin - Angular Admin Dashboard Template",
      },
      {
        path: "alta-clientes",
        children: [
          {
            path: "",
            component: AltaClientesComponent,
            title: "Alta de Clientes",
          },
          {
            path: "nuevo",
            component: ClienteFormComponent,
            title: "Nuevo cliente",
          },
          {
            path: "editar/:id",
            component: ClienteFormComponent,
            title: "Editar cliente",
          },
          {
            path: ":id/evaluaciones",
            component: ClientEvaluationsComponent,
            title: "Evaluaciones por empresa",
          },
          {
            path: ":id/evaluaciones/:assignmentId/usuarios/:userId",
            component: ClientEvaluationDetailComponent,
            title: "Detalle de evaluacion por usuario",
          },
        ],
      },
      {
        path: "firma-contrato",
        component: FirmaContratoComponent,
        title: "Firma de contrato",
      },
      {
        path: "calculadora-riesgos",
        component: CalculadoraRiesgosComponent,
        title: "Calculadora de riesgos",
      },
      {
        path: "notificaciones",
        component: NotificacionesComponent,
        title: "Notificaciones",
      },
      {
        path: "plan-remediacion",
        component: PlanRemediacionComponent,
        title: "Plan de remediacion",
      },
      {
        path: "profile",
        component: ProfileComponent,
        title:
          "Angular Profile Dashboard | TailAdmin - Angular Admin Dashboard Template",
      },
      {
        path: "configuracion",
        component: SettingsComponent,
        title: "Configuracion",
      },
      {
        path: "form-elements",
        component: FormElementsComponent,
        title:
          "Angular Form Elements Dashboard | TailAdmin - Angular Admin Dashboard Template",
      },
      {
        path: "basic-tables",
        component: BasicTablesComponent,
        title:
          "Angular Basic Tables Dashboard | TailAdmin - Angular Admin Dashboard Template",
      },
      {
        path: "blank",
        component: BlankComponent,
        title:
          "Angular Blank Dashboard | TailAdmin - Angular Admin Dashboard Template",
      },
      // support tickets
      {
        path: "invoice",
        component: InvoicesComponent,
        title:
          "Angular Invoice Details Dashboard | TailAdmin - Angular Admin Dashboard Template",
      },
      {
        path: "line-chart",
        component: LineChartComponent,
        title:
          "Angular Line Chart Dashboard | TailAdmin - Angular Admin Dashboard Template",
      },
      {
        path: "bar-chart",
        component: BarChartComponent,
        title:
          "Angular Bar Chart Dashboard | TailAdmin - Angular Admin Dashboard Template",
      },
      {
        path: "alerts",
        component: AlertsComponent,
        title:
          "Angular Alerts Dashboard | TailAdmin - Angular Admin Dashboard Template",
      },
      {
        path: "avatars",
        component: AvatarElementComponent,
        title:
          "Angular Avatars Dashboard | TailAdmin - Angular Admin Dashboard Template",
      },
      {
        path: "badge",
        component: BadgesComponent,
        title:
          "Angular Badges Dashboard | TailAdmin - Angular Admin Dashboard Template",
      },
      {
        path: "buttons",
        component: ButtonsComponent,
        title:
          "Angular Buttons Dashboard | TailAdmin - Angular Admin Dashboard Template",
      },
      {
        path: "images",
        component: ImagesComponent,
        title:
          "Angular Images Dashboard | TailAdmin - Angular Admin Dashboard Template",
      },
      {
        path: "videos",
        component: VideosComponent,
        title:
          "Angular Videos Dashboard | TailAdmin - Angular Admin Dashboard Template",
      },
      {
        path: "evaluaciones",
        loadChildren: () =>
          import("./features/evaluaciones/evaluaciones.routes").then(
            (m) => m.evaluacionesRoutes,
          ),
        title: "Evaluaciones Dinámicas",
      },
    ],
  },
  {
    path: "expediente/formulario/:token",
    loadComponent: () =>
      import(
        "./features/expediente/pages/expediente-publico-formulario/expediente-publico-formulario.component"
      ).then((m) => m.ExpedientePublicoFormularioComponent),
    title: "Expediente | Formulario Publico",
  },
  {
    path: "expediente",
    component: AppLayoutComponent,
    canActivate: [roleAccessGuard],
    data: {
      roles: ["expediente"],
    },
    children: expedienteRoutes,
  },
  // auth pages
  {
    path: "signin",
    component: SignInComponent,
    title:
      "Angular Sign In Dashboard | TailAdmin - Angular Admin Dashboard Template",
  },
  {
    path: "signup",
    component: SignUpComponent,
    title:
      "Angular Sign Up Dashboard | TailAdmin - Angular Admin Dashboard Template",
  },
  {
    path: "login-admin",
    canActivate: [loginRedirectGuard],
    loadComponent: () =>
      import("./pages/login/login-admin/login-admin.component").then(
        (m) => m.LoginAdminComponent,
      ),
    title: "MoonTest | Login Admin",
  },
  {
    path: "login-user",
    canActivate: [loginRedirectGuard],
    loadComponent: () =>
      import("./pages/login/login-user/login-user.component").then(
        (m) => m.LoginUserComponent,
      ),
    title: "MoonTest | Login User",
  },
  // error pages
  {
    path: "**",
    component: NotFoundComponent,
    title:
      "Angular NotFound Dashboard | TailAdmin - Angular Admin Dashboard Template",
  },
];
