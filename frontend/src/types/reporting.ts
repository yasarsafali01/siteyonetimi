export interface Dashboard {
  totalUnits: number;
  totalOutstandingDebt: number;
  chargedThisMonth: number;
  collectedThisMonth: number;
  openRequests: number;
  activeWorkOrders: number;
  pendingReservations: number;
}

export interface CollectionRatePeriod {
  period: string;
  charged: number;
  collected: number;
  ratePct: number;
}

export interface Debtor {
  unitId: string;
  unitNumber: string;
  blockName: string;
  totalCharged: number;
  totalPaid: number;
  remainingAmount: number;
}
