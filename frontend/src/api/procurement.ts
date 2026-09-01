import { apiClient } from "./client";
import type { PurchaseOrder, PurchaseRequest, Quote, Supplier, SupplierInvoice } from "../types/procurement";

export async function listSuppliers(siteId: string) {
  const { data } = await apiClient.get<Supplier[]>(`/sites/${siteId}/suppliers`);
  return data;
}

export async function createSupplier(siteId: string, input: { name: string; contactName?: string; phone?: string; email?: string }) {
  const { data } = await apiClient.post<Supplier>(`/sites/${siteId}/suppliers`, input);
  return data;
}

export async function listRequests(siteId: string) {
  const { data } = await apiClient.get<PurchaseRequest[]>(`/sites/${siteId}/purchase-requests`);
  return data;
}

export async function createRequest(siteId: string, input: { title: string; description?: string }) {
  const { data } = await apiClient.post<PurchaseRequest>(`/sites/${siteId}/purchase-requests`, input);
  return data;
}

export async function submitRequest(requestId: string) {
  const { data } = await apiClient.post<PurchaseRequest>(`/purchase-requests/${requestId}/submit`);
  return data;
}

export async function approveRequest(requestId: string) {
  const { data } = await apiClient.post<PurchaseRequest>(`/purchase-requests/${requestId}/approve`);
  return data;
}

export async function rejectRequest(requestId: string) {
  const { data } = await apiClient.post<PurchaseRequest>(`/purchase-requests/${requestId}/reject`);
  return data;
}

export async function listQuotes(requestId: string) {
  const { data } = await apiClient.get<Quote[]>(`/purchase-requests/${requestId}/quotes`);
  return data;
}

export async function createQuote(requestId: string, input: { supplierId: string; amount: number; note?: string }) {
  const { data } = await apiClient.post<Quote>(`/purchase-requests/${requestId}/quotes`, input);
  return data;
}

export async function selectQuote(requestId: string, quoteId: string) {
  const { data } = await apiClient.post<PurchaseOrder>(`/purchase-requests/${requestId}/quotes/${quoteId}/select`);
  return data;
}

export async function listOrders(siteId: string) {
  const { data } = await apiClient.get<PurchaseOrder[]>(`/sites/${siteId}/purchase-orders`);
  return data;
}

export async function markDelivered(orderId: string) {
  const { data } = await apiClient.post<PurchaseOrder>(`/purchase-orders/${orderId}/deliver`);
  return data;
}

export async function listInvoices(orderId: string) {
  const { data } = await apiClient.get<SupplierInvoice[]>(`/purchase-orders/${orderId}/invoices`);
  return data;
}

export async function createInvoice(orderId: string, input: { amount: number; invoiceDate: string; invoiceNo?: string }) {
  const { data } = await apiClient.post<SupplierInvoice>(`/purchase-orders/${orderId}/invoices`, input);
  return data;
}

export async function markInvoicePaid(invoiceId: string) {
  await apiClient.post(`/supplier-invoices/${invoiceId}/pay`);
}
