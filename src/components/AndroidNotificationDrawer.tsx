import React from 'react';

/**
 * Android Notification Drawer decommissioned:
 * Replaced exclusively with native Android OS System Notification Tray.
 */
interface AndroidNotificationDrawerProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const AndroidNotificationDrawer: React.FC<AndroidNotificationDrawerProps> = () => {
  return null;
};
