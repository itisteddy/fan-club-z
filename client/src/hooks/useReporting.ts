import { useState } from 'react';
import { ReportData } from '../components/reporting/ReportModal';

export const useReporting = () => {
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportData, setReportData] = useState<{
    contentType: 'prediction' | 'comment' | 'user';
    contentId: string;
    contentTitle?: string;
    contentAuthor?: string;
  } | null>(null);

  const openReportModal = (
    contentType: 'prediction' | 'comment' | 'user',
    contentId: string,
    contentTitle?: string,
    contentAuthor?: string
  ) => {
    setReportData({
      contentType,
      contentId,
      contentTitle,
      contentAuthor
    });
    setIsReportModalOpen(true);
  };

  const closeReportModal = () => {
    setIsReportModalOpen(false);
    setReportData(null);
  };

  return {
    isReportModalOpen,
    reportData,
    openReportModal,
    closeReportModal
  };
};
