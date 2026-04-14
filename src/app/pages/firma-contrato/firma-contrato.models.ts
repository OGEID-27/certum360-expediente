export type ContractStatus =
  | "Pendiente"
  | "Enviado"
  | "Firmado"
  | "Rechazado"
  | "Vencido";

export interface ContractSigner {
  name: string;
  role: string;
  email: string;
}

export interface ContractData {
  id: string;
  name: string;
  clientName: string;
  companyName: string;
  version: string;
  status: ContractStatus;
  issuedAt: string;
  signingDueAt: string;
  signedAt: string | null;
  lastUpdatedAt: string;
  primarySigner: ContractSigner;
  fileName: string;
  fileSize: string;
  observations: string;
  serviceScope: string[];
}

export interface ContractVersion {
  id: string;
  version: string;
  issuedAt: string;
  status: ContractStatus;
  observation: string;
  signedAt?: string | null;
  isCurrent?: boolean;
}

export interface ContractSignaturePayload {
  name: string;
  role: string;
  email: string;
  accepted: boolean;
}

export interface ContractTimelineItem {
  title: string;
  description: string;
  state: "done" | "current" | "warning";
}

export function getContractStatusClasses(status: ContractStatus): string {
  switch (status) {
    case "Firmado":
      return "border-success-300 bg-success-50 text-success-700 dark:border-success-500/40 dark:bg-success-500/10 dark:text-success-300";
    case "Enviado":
      return "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-300";
    case "Pendiente":
      return "border-warning-300 bg-warning-50 text-warning-700 dark:border-warning-500/40 dark:bg-warning-500/10 dark:text-warning-300";
    case "Rechazado":
      return "border-error-300 bg-error-50 text-error-700 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-300";
    case "Vencido":
      return "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200";
    default:
      return "border-gray-300 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300";
  }
}
