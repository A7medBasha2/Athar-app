import React from 'react';

export interface IslamicAlarmModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

/**
 * IslamicAlarmModal - تم حذف واجهة منبهات الاستيقاظ والفجر بالكامل
 */
export const IslamicAlarmModal: React.FC<IslamicAlarmModalProps> = () => null;
export default IslamicAlarmModal;
