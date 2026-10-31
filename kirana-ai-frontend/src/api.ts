import type { ChatMessage, CreditCustomer, Product, Transaction } from './types/retail';

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || 'http://localhost:8000';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    });
  } catch {
    throw new ApiError(`Cannot reach the server at ${API_URL}. Is the backend running?`, 0);
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (typeof body.detail === 'string') message = body.detail;
      else if (Array.isArray(body.detail) && body.detail[0]?.msg) message = body.detail[0].msg;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(message, res.status);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export interface ChatReply {
  text: string;
  quickAction?: ChatMessage['quickAction'] | null;
  dataPayload?: ChatMessage['dataPayload'] | null;
  source?: 'gemini' | 'fallback';
  fallbackReason?: string | null;
}

export const api = {
  listProducts: () => request<Product[]>('/products'),
  createProduct: (p: Omit<Product, 'id'>) =>
    request<Product>('/products', { method: 'POST', body: JSON.stringify(p) }),
  updateProduct: (id: string, p: Partial<Product>) =>
    request<Product>(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(p) }),
  deleteProduct: (id: string) => request<void>(`/products/${id}`, { method: 'DELETE' }),

  listSales: (limit = 500) => request<Transaction[]>(`/sales?limit=${limit}`),
  createSale: (body: {
    items: { productId: string; quantity: number }[];
    paymentMethod: string;
    customerName?: string;
  }) => request<Transaction>('/sales', { method: 'POST', body: JSON.stringify(body) }),

  listCustomers: () => request<CreditCustomer[]>('/customers'),

  chat: (message: string, history: { sender: 'user' | 'assistant'; text: string }[] = []) =>
    request<ChatReply>('/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({ message, history }),
    }),
};
