export type TCG = 'pokemon' | 'onePiece' | 'yugioh' | 'mtg';
export type GradingCompany = 'psa' | 'bgs' | 'cgc';
export type VerificationStatus = 'verified' | 'pending' | 'failed' | 'manual';
export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'unknown';
export type AlertRuleType =
  | 'priceAbove' | 'priceBelow'
  | 'dailyPercentIncrease' | 'dailyPercentDecrease'
  | 'weeklyPercentIncrease' | 'weeklyPercentDecrease'
  | 'gainFromAcquisition' | 'lossFromAcquisition' | 'confidenceDrop';

export interface CatalogItem {
  id: string; tcg: TCG; language: string; title: string; year: string;
  setName: string; cardNumber: string; variant?: string;
  gradingCompany?: GradingCompany; grade?: string; canonicalKey: string;
  metadataSource: string; imageUrl?: string;
}
export interface Certification {
  id: string; certNumber: string; gradingCompany: GradingCompany;
  catalogItemId: string; labelRawText?: string;
  verificationStatus: VerificationStatus; verificationSource?: string;
}
export interface Holding {
  id: string; certificationId: string; catalogItemId: string;
  acquisitionPrice?: number; acquisitionCurrency?: string; acquisitionDate?: string;
  acquisitionSource?: string; storageLocation?: string; notes?: string;
  frontImageUrl?: string; backImageUrl?: string; labelImageUrl?: string;
  createdAt: string;
}
export interface PricePoint { date: string; median: number; }
export interface PriceSnapshot {
  catalogItemId: string; currency: string;
  medianPrice: number; lowPrice: number | null; highPrice: number | null;
  sourceCount: number; confidenceScore: number; confidenceLevel: ConfidenceLevel;
  observedAt: string; providerName: string;
}
export interface PriceQuote {
  medianPrice: number; lowPrice: number | null; highPrice: number | null;
  sourceCount: number; confidenceScore: number; confidenceLevel: ConfidenceLevel;
  observedAt: string; providerName: string; history: PricePoint[];
}
export interface AlertRule {
  id: string; holdingId: string; ruleType: AlertRuleType;
  targetValue: number; isEnabled: boolean; lastTriggeredAt?: string;
}
export interface PriceProvider { name: string; getQuote(catalogItemId: string): Promise<PriceQuote | null>; }
