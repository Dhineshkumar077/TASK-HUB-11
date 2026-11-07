import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  CreditCard,
  Smartphone,
  Building,
  CheckCircle,
  AlertCircle,
  X,
  ArrowRight,
  Sparkles,
  Zap,
  Info,
} from 'lucide-react';

interface EscrowPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (paymentDetails: {
    paymentMethod: string;
    paymentReference: string;
    totalAmount: number;
    platformFee: number;
  }) => void;
  gigTitle: string;
  requiredWorkers: number;
  unitPaymentAmount: number;
  paymentBasis: string;
  platformFeeRate?: number; // e.g. 5% or 7.5%
}

export const EscrowPaymentModal: React.FC<EscrowPaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  gigTitle,
  requiredWorkers,
  unitPaymentAmount,
  paymentBasis,
  platformFeeRate = 5,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'UPI' | 'CARD' | 'NET_BANKING'>('UPI');
  const [upiProvider, setUpiProvider] = useState<'GPAY' | 'PHONEPE' | 'PAYTM' | 'CUSTOM'>('GPAY');
  const [customUpiId, setCustomUpiId] = useState('');
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');

  // Card form state
  const [cardNumber, setCardNumber] = useState('4532 •••• •••• 8892');
  const [cardHolder, setCardHolder] = useState('Host Account');
  const [cardExpiry, setCardExpiry] = useState('08/29');
  const [cardCvv, setCardCvv] = useState('•••');

  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [txnReference, setTxnReference] = useState('');

  if (!isOpen) return null;

  // Dynamic Commission Tiers: 1-5 members default 10%, >5 members default 5% bulk discount
  const effectiveFeeRate = platformFeeRate !== undefined && platformFeeRate !== 5
    ? platformFeeRate
    : (requiredWorkers <= 5 ? 10 : 5);
  const totalBudget = Math.round(requiredWorkers * unitPaymentAmount * 100) / 100;
  const platformCommission = Math.round(((totalBudget * effectiveFeeRate) / 100) * 100) / 100;
  const netWorkerPool = Math.max(0, Math.round((totalBudget - platformCommission) * 100) / 100);
  const totalPayableEscrow = totalBudget; // Platform fee is deducted from the Gig Host's posted budget

  const handlePayAndDeposit = () => {
    setIsProcessing(true);
    const ref = `RZP-ESC-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;
    setTxnReference(ref);

    setTimeout(() => {
      setIsProcessing(false);
      setIsCompleted(true);
      setTimeout(() => {
        onSuccess({
          paymentMethod: selectedMethod === 'UPI' ? `UPI_${upiProvider}` : selectedMethod,
          paymentReference: ref,
          totalAmount: totalPayableEscrow,
          platformFee: platformCommission,
        });
      }, 1200);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 max-w-xl w-full rounded-3xl shadow-2xl overflow-hidden relative">
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-indigo-900/60 via-slate-900 to-slate-900 px-6 py-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">Pre-Publish Escrow Gateway</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
                  RBI Compliant
                </span>
              </div>
              <p className="text-xs text-slate-400">Funds are held in TaskHub Escrow Reserve until job completion</p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isProcessing || isCompleted}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isCompleted ? (
          <div className="p-8 text-center space-y-4 animate-scale-in">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center mx-auto text-emerald-400 animate-pulse">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-xl font-black text-white">Escrow Reserve Locked!</h4>
              <p className="text-xs text-slate-400 mt-1">
                ₹{totalPayableEscrow.toLocaleString()} has been securely deposited into TaskHub Escrow Reserve.
              </p>
              <div className="mt-3 font-mono text-[11px] text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 inline-block">
                Reference ID: <span className="text-emerald-400 font-bold">{txnReference}</span>
              </div>
            </div>
            <div className="text-xs text-indigo-300 font-medium">Publishing gig live to platform...</div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Gig & Escrow Summary Box */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-wider">
                    Gig Posting Deposit
                  </span>
                  <h4 className="text-sm font-bold text-white line-clamp-1">{gigTitle || 'New Gig Shift'}</h4>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-white font-mono">₹{totalPayableEscrow.toLocaleString()}</div>
                  <span className="text-[10px] text-emerald-400 font-semibold flex items-center justify-end gap-1">
                    <Lock className="w-3 h-3" /> 100% Escrow Protected
                  </span>
                </div>
              </div>

              {/* Breakdown */}
              <div className="pt-2 border-t border-slate-800/80 space-y-1.5 text-xs text-slate-400">
                <div className="flex justify-between">
                  <span>Posted Gig Budget ({requiredWorkers} workers × ₹{unitPaymentAmount}):</span>
                  <span className="font-mono text-slate-200">₹{totalBudget.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-indigo-400">
                  <span>Platform Brokerage Fee ({effectiveFeeRate}% {requiredWorkers > 5 ? 'Bulk' : 'Standard'} Tier — Deducted):</span>
                  <span className="font-mono font-semibold">-₹{platformCommission.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-emerald-400 font-medium">
                  <span>Net Partner Payout Pool (Distributed to Workers):</span>
                  <span className="font-mono">₹{netWorkerPool.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-900">
                  <span>Gig Host Escrow Deposit Total:</span>
                  <span className="font-mono font-bold text-white">₹{totalPayableEscrow.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Select Deposit Method
              </label>

              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedMethod('UPI')}
                  className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition cursor-pointer ${
                    selectedMethod === 'UPI'
                      ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-lg shadow-indigo-500/10'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Smartphone className="w-4 h-4 text-indigo-400" />
                  <span>UPI / QR</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMethod('CARD')}
                  className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition cursor-pointer ${
                    selectedMethod === 'CARD'
                      ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-lg shadow-indigo-500/10'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-indigo-400" />
                  <span>Debit / Card</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMethod('NET_BANKING')}
                  className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition cursor-pointer ${
                    selectedMethod === 'NET_BANKING'
                      ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-lg shadow-indigo-500/10'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Building className="w-4 h-4 text-indigo-400" />
                  <span>Net Banking</span>
                </button>
              </div>

              {/* Sub-options: UPI */}
              {selectedMethod === 'UPI' && (
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3 animate-fade-in">
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    {(['GPAY', 'PHONEPE', 'PAYTM', 'CUSTOM'] as const).map((app) => (
                      <button
                        key={app}
                        type="button"
                        onClick={() => setUpiProvider(app)}
                        className={`py-2 px-2 rounded-xl border font-semibold text-center transition cursor-pointer ${
                          upiProvider === app
                            ? 'border-indigo-500 bg-indigo-500/20 text-white'
                            : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {app === 'GPAY'
                          ? 'Google Pay'
                          : app === 'PHONEPE'
                          ? 'PhonePe'
                          : app === 'PAYTM'
                          ? 'Paytm'
                          : 'Any UPI ID'}
                      </button>
                    ))}
                  </div>

                  {upiProvider === 'CUSTOM' ? (
                    <div>
                      <input
                        type="text"
                        value={customUpiId}
                        onChange={(e) => setCustomUpiId(e.target.value)}
                        placeholder="e.g. yourname@okhdfcbank"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      Instant UPI push notification will be simulated directly to your {upiProvider} app.
                    </div>
                  )}
                </div>
              )}

              {/* Sub-options: Cards */}
              {selectedMethod === 'CARD' && (
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3 text-xs animate-fade-in">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Card Number</label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="text-[11px] text-slate-400 block mb-1">Cardholder Name</label>
                      <input
                        type="text"
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Expiry</label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-options: Net Banking */}
              {selectedMethod === 'NET_BANKING' && (
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2 text-xs animate-fade-in">
                  <label className="text-[11px] text-slate-400 block">Choose Bank</label>
                  <select
                    value={selectedBank}
                    onChange={(e) => setSelectedBank(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="HDFC Bank">HDFC Bank</option>
                    <option value="State Bank of India">State Bank of India (SBI)</option>
                    <option value="ICICI Bank">ICICI Bank</option>
                    <option value="Axis Bank">Axis Bank</option>
                    <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                    <option value="Punjab National Bank">Punjab National Bank</option>
                  </select>
                </div>
              )}
            </div>

            {/* Escrow Guarantee Disclaimer */}
            <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-indigo-300">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-indigo-400" />
              <p className="leading-relaxed">
                Escrow Guarantee: Your funds remain securely locked until workers check out and you review the on-site completion log. Any unfilled slots are 100% refunded to your source account upon shift deadline.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isProcessing}
                className="w-1/3 py-3 rounded-2xl border border-slate-800 hover:bg-slate-800 text-xs font-bold text-slate-300 transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handlePayAndDeposit}
                disabled={isProcessing}
                className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Processing Escrow Lock...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Deposit ₹{totalPayableEscrow.toLocaleString()} & Publish Gig</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
