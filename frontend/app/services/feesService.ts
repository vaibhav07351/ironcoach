import type { FeePackage, FeeSummary, PackageInput, Payment, PaymentInput } from '../types/fees';
import { newClientId } from '../utils/ids';
import { http } from './http';

/** One client's packages (with usage), recent payments and what is due. */
export function getFees(traineeId: string): Promise<FeeSummary> {
  return http.get<FeeSummary>(`/fees/${encodeURIComponent(traineeId)}`);
}

/**
 * Sells a package. A client_id is attached automatically, so retrying the same call (same input
 * object) after a timeout returns the original package instead of selling it twice.
 */
export async function addPackage(traineeId: string, input: PackageInput): Promise<FeePackage> {
  const body: PackageInput = { ...input, client_id: input.client_id ?? newClientId() };
  const res = await http.post<{ package: FeePackage }>(`/fees/${encodeURIComponent(traineeId)}/packages`, body);
  return res.package;
}

/** Records a payment (idempotent in the same way as addPackage). */
export async function addPayment(traineeId: string, input: PaymentInput): Promise<Payment> {
  const body: PaymentInput = { ...input, client_id: input.client_id ?? newClientId() };
  const res = await http.post<{ payment: Payment }>(`/fees/${encodeURIComponent(traineeId)}/payments`, body);
  return res.payment;
}

export function deletePackage(id: string): Promise<void> {
  return http.delete<void>(`/packages/${encodeURIComponent(id)}`);
}

export function deletePayment(id: string): Promise<void> {
  return http.delete<void>(`/payments/${encodeURIComponent(id)}`);
}
