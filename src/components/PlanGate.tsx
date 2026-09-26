import React, { ReactNode } from 'react';
import { useCredits } from '@/hooks/useCredits';
import { ForbiddenPage } from './ForbiddenPage';

interface PlanGateProps {
  children: ReactNode;
  requiredPlan?: 'pro' | 'enterprise';
  featureName?: string;
  fallback?: ReactNode;
}

export function PlanGate({
  children,
  requiredPlan = 'pro',
  featureName,
  fallback,
}: PlanGateProps) {
  const { planName, loading } = useCredits();

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const isProOrAbove =
    planName.includes('专业') ||
    planName.includes('企业') ||
    planName.includes('旗舰') ||
    planName.toLowerCase().includes('pro');

  const isEnterprise =
    planName.includes('企业') ||
    planName.includes('旗舰') ||
    planName.toLowerCase().includes('enterprise');

  let hasAccess = true;
  let requiredLabel = '专业版';

  if (requiredPlan === 'pro') {
    hasAccess = isProOrAbove;
    requiredLabel = '专业版';
  } else if (requiredPlan === 'enterprise') {
    hasAccess = isEnterprise;
    requiredLabel = '企业版';
  }

  if (!hasAccess) {
    return fallback ?? <ForbiddenPage requiredPlan={requiredLabel} featureName={featureName} />;
  }

  return <>{children}</>;
}

export default PlanGate;
