import { ContractData, ContractVersion } from "./firma-contrato.models";

export function getFirmaContratoMock(): {
  contract: ContractData;
  versions: ContractVersion[];
} {
  return {
    contract: {
      id: "CTR-ADM-2026-032",
      name: "Contrato de servicio MoonTest Enterprise",
      clientName: "Grupo Delta Manufactura",
      companyName: "Grupo Delta Manufactura, S.A. de C.V.",
      version: "v3.2",
      status: "Pendiente",
      issuedAt: "2026-03-05T09:00:00",
      signingDueAt: "2026-03-25T18:00:00",
      signedAt: null,
      lastUpdatedAt: "2026-03-18T11:30:00",
      primarySigner: {
        name: "Laura Mendoza Ruiz",
        role: "Directora de Operaciones",
        email: "laura.mendoza@grupodelta.mx",
      },
      fileName: "Contrato-Servicio-MoonTest-v3.2.pdf",
      fileSize: "2.4 MB",
      observations:
        "Incluye alcance multisede, soporte operativo, renovacion anual y clausula de confidencialidad actualizada.",
      serviceScope: [
        "Acceso a plataforma ADMIN",
        "Soporte funcional y tecnico",
        "Panel de seguimiento contractual",
        "Actualizaciones menores incluidas",
      ],
    },
    versions: [
      {
        id: "ctr-v3-2",
        version: "v3.2",
        issuedAt: "2026-03-05T09:00:00",
        status: "Pendiente",
        observation:
          "Version vigente enviada para revision final y firma digital del cliente.",
        isCurrent: true,
        signedAt: null,
      },
      {
        id: "ctr-v3-1",
        version: "v3.1",
        issuedAt: "2026-02-21T12:15:00",
        status: "Rechazado",
        observation:
          "Se ajusto la cobertura de soporte y el apartado de alcance operativo.",
        isCurrent: false,
        signedAt: null,
      },
      {
        id: "ctr-v3-0",
        version: "v3.0",
        issuedAt: "2026-02-10T10:30:00",
        status: "Vencido",
        observation:
          "Primera emision contractual sustituida por cambios comerciales y de SLA.",
        isCurrent: false,
        signedAt: null,
      },
    ],
  };
}
