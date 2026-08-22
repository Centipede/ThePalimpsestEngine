export type AnnotationPurposeType = 'UH' | 'TS';
export type AnnotationToolType = 'HCS' | 'HVS';

export interface AnnotationPurpose {
  id: number;
  order_key: number;
  purpose: AnnotationPurposeType;
  tooltype: AnnotationToolType;
  name: string;
  color: string;
}
