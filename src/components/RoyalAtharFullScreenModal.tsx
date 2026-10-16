import React from 'react';

export interface RoyalAtharFullScreenModalProps {
  onNavigateToQuran?: () => void;
  onNavigateToTasbih?: () => void;
  onNavigateToAdhkar?: () => void;
}

/**
 * RoyalAtharFullScreenModal - تم حذف واجهة شاشة التنبيه الملكية بالكامل
 */
export const RoyalAtharFullScreenModal: React.FC<RoyalAtharFullScreenModalProps> = () => null;
export default RoyalAtharFullScreenModal;
