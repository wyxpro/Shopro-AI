import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Zap, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ForbiddenPageProps {
  requiredPlan?: string;
  featureName?: string;
}

export function ForbiddenPage({
  requiredPlan = '专业版',
  featureName = '该功能',
}: ForbiddenPageProps) {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
        <ShieldAlert className="w-8 h-8 text-amber-500" />
      </div>
      <h2 className="text-xl font-bold tracking-tight text-foreground mb-2">
        需升级套餐后解锁
      </h2>
      <p className="text-sm text-muted-foreground max-w-md mb-6 leading-relaxed">
        {featureName} 目前仅对 <span className="font-semibold text-primary">{requiredPlan}</span> 及以上尊享用户开放。升级后即可畅享大批量并发生成、高速通道与高级 AI 工具。
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(-1)}
          className="gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" /> 返回上一页
        </Button>
        <Button
          size="sm"
          onClick={() => navigate('/credits')}
          className="gap-1.5 bg-gradient-to-r from-primary to-violet-600 hover:from-primary/90 hover:to-violet-600/90 text-white"
        >
          <Zap className="w-4 h-4" /> 查看套餐与权益
        </Button>
      </div>
    </div>
  );
}

export default ForbiddenPage;
