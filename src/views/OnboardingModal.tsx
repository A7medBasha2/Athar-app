import React from 'react';
import { Coordinates } from '../types';
import { PermissionsSetupWizard } from '../components/PermissionsSetupWizard';

interface OnboardingModalProps {
  isOpen: boolean;
  onFinish: (coords?: Coordinates) => void;
  onSkip?: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onFinish,
  onSkip,
}) => {
  return (
    <PermissionsSetupWizard
      isOpen={isOpen}
      onFinish={onFinish}
      onSkip={onSkip}
    />
  );
};

export default OnboardingModal;
