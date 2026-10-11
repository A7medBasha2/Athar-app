import React from 'react';

interface RotatingCardBackgroundProps {
  slot?: string;
  cardOffset?: number;
  intervalMs?: number;
  opacity?: number;
  variant?: 'gold' | 'emerald' | 'midnight' | 'amber';
}

/**
 * Islamic backgrounds and ornaments have been removed per user request.
 */
export const RotatingCardBackground: React.FC<RotatingCardBackgroundProps> = () => {
  return null;
};
