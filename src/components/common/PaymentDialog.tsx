import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QrCode, CheckCircle2, Copy, MessageSquareCode } from 'lucide-react';
import { toast } from 'sonner';

export interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pkgName?: string;
  price?: number | string;
  credits?: number | string;
}

export default function PaymentDialog({
  open,
  onOpenChange,
  pkgName = '爆款进阶包',
  price = '50',
  credits = '500',
}: PaymentDialogProps) {
  const [copied, setCopied] = useState(false);
  const [payStatus, setPayStatus] = useState<'scan' | 'completed'>('scan');

  const handleCopyWx = () => {
    navigator.clipboard.writeText('wyx200265');
    setCopied(true);
    toast.success('客服微信 wyx200265 已成功复制到剪贴板！');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleConfirmPay = () => {
    setPayStatus('completed');
    toast.success('支付提交成功！请联系客服微信 wyx200265 发送截图，立享极速到账服务！');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if(!v) setPayStatus('scan'); }}>
      <DialogContent className="w-[90vw] max-w-[410px] max-h-[88vh] p-0 overflow-hidden bg-[#14131d] border border-pink-500/30 text-white rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col my-auto">
        <DialogHeader className="p-4 sm:p-5 pb-3 sm:pb-4 bg-gradient-to-r from-pink-950/50 via-purple-950/40 to-zinc-900 border-b border-white/10 text-center relative shrink-0">
          <div className="mx-auto w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-500 flex items-center justify-center shadow-lg shadow-pink-500/30 mb-1.5 sm:mb-2">
            <QrCode className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-white" />
          </div>
          <DialogTitle className="text-base sm:text-lg font-bold text-white flex items-center justify-center gap-1.5 sm:gap-2">
            扫码安全支付
            <Badge variant="outline" className="border-pink-500/40 text-pink-400 text-[9px] sm:text-[10px] font-normal py-0">官方验证</Badge>
          </DialogTitle>
          <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5">支持 微信支付 / 支付宝 扫码快捷到账</p>
        </DialogHeader>

        <div className="p-3.5 sm:p-5 pt-3 overflow-y-auto flex flex-col items-center space-y-2.5 sm:space-y-3.5 text-center flex-1">
          {/* 套餐信息 */}
          <div className="w-full p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
            <div className="text-left">
              <span className="text-[10px] sm:text-xs text-zinc-400">已选方案</span>
              <p className="text-xs sm:text-sm font-bold text-white mt-0.5">{pkgName}</p>
              {credits && <span className="text-[10px] sm:text-[11px] text-pink-400 font-medium">包含 {credits} 积分</span>}
            </div>
            <div className="text-right">
              <span className="text-[10px] sm:text-xs text-zinc-400 block">应付金额</span>
              <div className="flex items-baseline gap-0.5 text-pink-300">
                <span className="text-xs sm:text-sm font-bold">¥</span>
                <span className="text-xl sm:text-2xl font-bold font-mono">{price}</span>
              </div>
            </div>
          </div>

          {/* 微信 / 支付宝 标签 */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] sm:text-xs px-2 py-0.5 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />微信支付
            </Badge>
            <Badge className="bg-sky-500/15 text-sky-400 border border-sky-500/30 text-[10px] sm:text-xs px-2 py-0.5 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />支付宝
            </Badge>
          </div>

          {/* 支付二维码图片：移动端自适应缩小，杜绝撑满屏幕 */}
          <div className="relative p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-white border border-white/20 shadow-xl shadow-pink-500/10">
            <img
              src="/pay.png"
              alt="支付二维码"
              className="w-36 h-36 sm:w-44 sm:h-44 object-contain rounded-lg sm:rounded-xl"
            />
          </div>

          {/* 重点提示：客服微信 */}
          <div className="w-full p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/30 space-y-1.5 sm:space-y-2">
            <div className="flex items-center justify-center gap-1 text-[11px] sm:text-xs text-pink-300 font-semibold flex-wrap">
              <MessageSquareCode className="w-3.5 h-3.5 text-pink-400 shrink-0" />
              <span>充值完成后请联系客服微信: <strong className="text-white font-mono text-xs sm:text-sm underline decoration-pink-500">wyx200265</strong></span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-zinc-400">扫码付款后发送截图给客服，立享 1v1 极速到账与专属指导服务！</p>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyWx}
              className="h-6 sm:h-7 text-[10px] sm:text-xs border-pink-500/30 text-pink-300 hover:bg-pink-500/20 gap-1 rounded-lg px-2.5"
            >
              <Copy className="w-3 h-3" />
              {copied ? '已复制客服微信' : '一键复制客服微信 wyx200265'}
            </Button>
          </div>

          {/* 操作按钮 */}
          <div className="w-full pt-0.5 flex gap-2">
            <Button
              className="flex-1 h-9 sm:h-10 bg-gradient-to-r from-pink-500 to-rose-500 hover:brightness-110 text-white font-semibold text-xs rounded-xl shadow-md shadow-pink-500/20 gap-1.5"
              onClick={handleConfirmPay}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {payStatus === 'completed' ? '已通知客服确认中' : '我已完成支付'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
