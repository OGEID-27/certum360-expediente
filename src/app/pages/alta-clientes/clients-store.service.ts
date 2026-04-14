import { Injectable } from '@angular/core';
import {
  AREAS_USUARIO_OPTIONS,
  Cliente,
  SaveClientePayload,
  SaveUsuarioClientePayload,
  UsuarioCliente,
} from './alta-clientes.models';

@Injectable({ providedIn: 'root' })
export class ClientsStoreService {
  readonly storageKeys = {
    clients: 'tenant_clients',
    clientUsers: 'tenant_client_users',
  } as const;

  constructor() {
    this.seedDemoData();
    this.normalizePersistedUsers();
  }

  listClients(): Cliente[] {
    return this.readClients().sort((a, b) => a.id - b.id);
  }

  getById(clientId: number): Cliente | undefined {
    return this.readClients().find((client) => client.id === clientId);
  }

  createClient(payload: SaveClientePayload): Cliente {
    const clients = this.readClients();
    const nextId = clients.reduce((max, item) => Math.max(max, item.id), 0) + 1;
    const now = new Date().toISOString();

    const client: Cliente = {
      id: nextId,
      ...payload,
      createdAt: now,
      updatedAt: now,
    };

    clients.push(client);
    this.writeClients(clients);
    return client;
  }

  updateClient(clientId: number, payload: SaveClientePayload): Cliente | undefined {
    const clients = this.readClients();
    const index = clients.findIndex((item) => item.id === clientId);
    if (index < 0) {
      return undefined;
    }

    const updated: Cliente = {
      ...clients[index],
      ...payload,
      id: clientId,
      updatedAt: new Date().toISOString(),
    };

    clients[index] = updated;
    this.writeClients(clients);
    return updated;
  }

  setClientStatus(clientId: number, status: Cliente['estatus']): Cliente | undefined {
    const client = this.getById(clientId);
    if (!client) {
      return undefined;
    }

    return this.updateClient(clientId, {
      ...client,
      estatus: status,
    });
  }

  listUsersByClient(clientId: number): UsuarioCliente[] {
    const usersMap = this.readClientUsersMap();
    const users = usersMap[clientId] ?? [];
    return [...users].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }

  saveUser(clientId: number, payload: SaveUsuarioClientePayload): UsuarioCliente {
    const usersMap = this.readClientUsersMap();
    const users = [...(usersMap[clientId] ?? [])];
    const now = new Date().toISOString();

    if (payload.id) {
      const index = users.findIndex((item) => item.id === payload.id);
      if (index >= 0) {
        users[index] = {
          ...users[index],
          ...payload,
          id: payload.id,
          clientId,
          area: this.normalizeArea(payload.area),
          updatedAt: now,
        };
        usersMap[clientId] = users;
        this.writeClientUsersMap(usersMap);
        return users[index];
      }
    }

    const nextId = users.reduce((max, item) => Math.max(max, item.id), 0) + 1;
    const newUser: UsuarioCliente = {
      id: nextId,
      clientId,
      nombres: payload.nombres,
      apellidos: payload.apellidos,
      email: payload.email,
      telefono: payload.telefono,
      area: this.normalizeArea(payload.area),
      estatus: payload.estatus,
      createdAt: now,
      updatedAt: now,
    };

    users.push(newUser);
    usersMap[clientId] = users;
    this.writeClientUsersMap(usersMap);
    return newUser;
  }

  updateUserStatus(clientId: number, userId: number, status: UsuarioCliente['estatus']): UsuarioCliente | undefined {
    const usersMap = this.readClientUsersMap();
    const users = [...(usersMap[clientId] ?? [])];
    const index = users.findIndex((item) => item.id === userId);

    if (index < 0) {
      return undefined;
    }

    users[index] = {
      ...users[index],
      estatus: status,
      updatedAt: new Date().toISOString(),
    };

    usersMap[clientId] = users;
    this.writeClientUsersMap(usersMap);
    return users[index];
  }

  getUserCount(clientId: number): number {
    return this.listUsersByClient(clientId).length;
  }

  getUserCountsMap(): Record<number, number> {
    const usersMap = this.readClientUsersMap();
    return Object.entries(usersMap).reduce<Record<number, number>>((acc, [key, users]) => {
      const numericKey = Number(key);
      if (Number.isFinite(numericKey)) {
        acc[numericKey] = users.length;
      }
      return acc;
    }, {});
  }

  isEmailTakenByClient(clientId: number, email: string, excludeUserId?: number): boolean {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      return false;
    }

    return this.listUsersByClient(clientId).some(
      (user) => user.email.trim().toLowerCase() === normalizedEmail && user.id !== excludeUserId,
    );
  }

  private seedDemoData(): void {
    const currentClients = this.readClients();
    if (currentClients.length > 0) {
      return;
    }

    const now = new Date().toISOString();
    const clients: Cliente[] = [
      {
        id: 1,
        photoUrl: '/images/user/user-01.jpg',
        tipoCliente: 'MORAL',
        nombreCliente: 'Agroinsumos del Norte',
        sector: 'Agroindustrial',
        rfc: 'AGN920312AB1',
        contactoNombre: 'Laura Mendez',
        correoPrincipal: 'laura.mendez@agroinsumos.mx',
        estatus: 'Activo',
        telefono: '8112345678',
        notas: 'Cliente principal para sector norte.',
        razonSocialFiscal: 'Agroinsumos del Norte SA de CV',
        nombreFiscal: '',
        regimenFiscal: '601 - General de Ley Personas Morales',
        cpFiscal: '64000',
        domicilioFiscal: {
          calle: 'Av. Constitucion',
          numeroExt: '1001',
          numeroInt: '12B',
          colonia: 'Centro',
          municipio: 'Monterrey',
          estado: 'Nuevo Leon',
          pais: 'Mexico',
        },
        correoFacturacion: 'facturacion@agroinsumos.mx',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 2,
        tipoCliente: 'MORAL',
        nombreCliente: 'Soluciones Hidraulicas MX',
        sector: 'Infraestructura',
        rfc: '',
        contactoNombre: 'Carlos Ramirez',
        correoPrincipal: 'carlos.ramirez@shmx.com',
        estatus: 'Prospecto',
        telefono: '5512349012',
        notas: 'Pendiente de cerrar propuesta comercial.',
        razonSocialFiscal: '',
        nombreFiscal: '',
        regimenFiscal: '',
        cpFiscal: '',
        domicilioFiscal: {
          calle: '',
          numeroExt: '',
          numeroInt: '',
          colonia: '',
          municipio: '',
          estado: '',
          pais: 'Mexico',
        },
        correoFacturacion: '',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 3,
        tipoCliente: 'FISICA',
        nombreCliente: 'Grupo Clinico Integral',
        sector: 'Salud',
        rfc: 'TOAA8501059L1',
        contactoNombre: 'Ana Torres',
        correoPrincipal: 'ana.torres@gci.mx',
        estatus: 'Pendiente',
        telefono: '2221234567',
        notas: '',
        razonSocialFiscal: '',
        nombreFiscal: 'Ana Torres Olivares',
        regimenFiscal: '612 - Personas Fisicas con Actividades Empresariales y Profesionales',
        cpFiscal: '72160',
        domicilioFiscal: {
          calle: 'Calle 21 Sur',
          numeroExt: '412',
          numeroInt: '',
          colonia: 'La Paz',
          municipio: 'Puebla',
          estado: 'Puebla',
          pais: 'Mexico',
        },
        correoFacturacion: 'facturas@gci.mx',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 4,
        tipoCliente: 'MORAL',
        nombreCliente: 'Logistica Costera',
        sector: 'Transporte',
        rfc: 'LCO101101KJ2',
        contactoNombre: 'Diego Morales',
        correoPrincipal: 'diego.morales@logcostera.com',
        estatus: 'Inactivo',
        telefono: '9987654321',
        notas: 'Cuenta pausada por renovacion de contrato.',
        razonSocialFiscal: 'Logistica Costera SA de CV',
        nombreFiscal: '',
        regimenFiscal: '601 - General de Ley Personas Morales',
        cpFiscal: '77500',
        domicilioFiscal: {
          calle: 'Av. Tulum',
          numeroExt: '889',
          numeroInt: '',
          colonia: 'Supermanzana 5',
          municipio: 'Cancun',
          estado: 'Quintana Roo',
          pais: 'Mexico',
        },
        correoFacturacion: 'facturas@logcostera.com',
        createdAt: now,
        updatedAt: now,
      },
    ];

    const clientUsers: Record<number, UsuarioCliente[]> = {
      1: [
        {
          id: 1,
          clientId: 1,
          nombres: 'Adrian',
          apellidos: 'Molina',
          email: 'adrian@moontest.mx',
          telefono: '5550001122',
          area: 'Sistemas',
          estatus: 'Activo',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 2,
          clientId: 1,
          nombres: 'Mario',
          apellidos: 'Rangel',
          email: 'mario.rangel@agroinsumos.mx',
          telefono: '8111112233',
          area: 'Operaciones',
          estatus: 'Activo',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 3,
          clientId: 1,
          nombres: 'Fernanda',
          apellidos: 'Solis',
          email: 'fernanda.solis@agroinsumos.mx',
          telefono: '',
          area: 'Contaduria',
          estatus: 'Bloqueado',
          createdAt: now,
          updatedAt: now,
        },
      ],
      3: [
        {
          id: 1,
          clientId: 3,
          nombres: 'Eduardo',
          apellidos: 'Torres',
          email: 'eduardo.torres@gci.mx',
          telefono: '2224445577',
          area: 'RH',
          estatus: 'Activo',
          createdAt: now,
          updatedAt: now,
        },
      ],
    };

    this.writeClients(clients);
    this.writeClientUsersMap(clientUsers);
  }

  private readClients(): Cliente[] {
    return this.readArray<Cliente>(this.storageKeys.clients);
  }

  private writeClients(clients: Cliente[]): void {
    localStorage.setItem(this.storageKeys.clients, JSON.stringify(clients));
  }

  private readClientUsersMap(): Record<number, UsuarioCliente[]> {
    const parsed = this.readRecord<UsuarioCliente[]>(this.storageKeys.clientUsers);

    return Object.entries(parsed).reduce<Record<number, UsuarioCliente[]>>((acc, [key, users]) => {
      const numericKey = Number(key);
      if (Number.isFinite(numericKey)) {
        acc[numericKey] = Array.isArray(users)
          ? users.map((user) => this.normalizeStoredUser(user, numericKey))
          : [];
      }
      return acc;
    }, {});
  }

  private writeClientUsersMap(value: Record<number, UsuarioCliente[]>): void {
    localStorage.setItem(this.storageKeys.clientUsers, JSON.stringify(value));
  }

  private normalizePersistedUsers(): void {
    const currentMap = this.readClientUsersMap();
    const allUsers = Object.values(currentMap).flat();
    const hasAdrian = allUsers.some(
      (user) => user.email.trim().toLowerCase() === 'adrian@moontest.mx',
    );

    if (!hasAdrian) {
      const targetClientId = this.getById(1) ? 1 : Number(Object.keys(currentMap)[0] ?? 0);
      if (targetClientId > 0) {
        const users = [...(currentMap[targetClientId] ?? [])];
        const nextId = users.reduce((max, item) => Math.max(max, item.id), 0) + 1;
        const now = new Date().toISOString();
        users.unshift({
          id: nextId,
          clientId: targetClientId,
          nombres: 'Adrian',
          apellidos: 'Molina',
          email: 'adrian@moontest.mx',
          telefono: '5550001122',
          area: 'Sistemas',
          estatus: 'Activo',
          createdAt: now,
          updatedAt: now,
        });
        currentMap[targetClientId] = users;
      }
    }

    this.writeClientUsersMap(currentMap);
  }

  private readArray<T>(key: string): T[] {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }

  private readRecord<T>(key: string): Record<string, T> {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return {};
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, T>)
        : {};
    } catch {
      return {};
    }
  }

  private normalizeStoredUser(user: Partial<UsuarioCliente>, clientId: number): UsuarioCliente {
    const now = new Date().toISOString();
    return {
      id: Number(user.id ?? 0),
      clientId: Number(user.clientId ?? clientId),
      nombres: String(user.nombres ?? '').trim(),
      apellidos: String(user.apellidos ?? '').trim(),
      email: String(user.email ?? '').trim().toLowerCase(),
      telefono: String(user.telefono ?? '').trim(),
      area: this.normalizeArea(user.area),
      estatus: user.estatus === 'Bloqueado' ? 'Bloqueado' : 'Activo',
      createdAt: String(user.createdAt ?? now),
      updatedAt: String(user.updatedAt ?? user.createdAt ?? now),
    };
  }

  private normalizeArea(value: unknown): string {
    const normalized = String(value ?? '').trim();
    if (!normalized) {
      return 'Otro';
    }

    return AREAS_USUARIO_OPTIONS.find(
      (option) => option.toLowerCase() === normalized.toLowerCase(),
    ) ?? normalized;
  }
}
