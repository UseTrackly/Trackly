import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, TrendingUp, TrendingDown, Save, Trash2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { formatCurrency } from '@/lib/currencyFormatter';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { format } from 'date-fns';

const SPORTS = [
  { value: 'football', label: '🏈 Football' },
  { value: 'basketball', label: '🏀 Basketball' },
  { value: 'baseball', label: '⚾ Baseball' },
  { value: 'hockey', label: '🏒 Hockey' },
  { value: 'soccer', label: '⚽ Soccer' },
  { value: 'golf', label: '⛳ Golf' },
  { value: 'mma', label: '🥊 MMA' },
  { value: 'boxing', label: '🥋 Boxing' },
  { value: 'tennis', label: '🎾 Tennis' },
  { value: 'other', label: '🏆 Other' },
];

const BET_TYPES = [
  { value: 'moneyline', label: 'Moneyline' },
  { value: 'spread', label: 'Spread' },
  { value: 'over_under', label: 'Over/Under' },
  { value: 'parlay', label: 'Parlay' },
  { value: 'prop', label: 'Prop Bet' },
  { value: 'futures', label: 'Futures' },
  { value: 'live', label: 'Live Bet' },
  { value: 'other', label: 'Other' },
];

const SPORTSBOOKS = [
  { value: 'draftkings', label: 'DraftKings' },
  { value: 'fanduel', label: 'FanDuel' },
  { value: 'betmgm', label: 'BetMGM' },
  { value: 'caesars', label: 'Caesars' },
  { value: 'pointsbet', label: 'PointsBet' },
  { value: 'barstool', label: 'Barstool' },
  { value: 'bet365', label: 'Bet365' },
  { value: 'bovada', label: 'Bovada' },
  { value: 'other', label: 'Other' },
];

function calcPayout(wager, odds) {
  const o = parseInt(odds);
  if (isNaN(o)) return null;
  if (o > 0) return wager + (wager * o / 100);
  if (o < 0) return wager + (wager * 100 / Math.abs(o));
  return null;
}

export default function SportsBetTracker({ user }) {
  const [sport, setSport] = useState('football');
  const [betType, setBetType] = useState('moneyline');
  const [sportsbook, setSportsbook] = useState('draftkings');
  const [description, setDescription] = useState('');
  const [wager, setWager] = useState('');
  const [odds, setOdds] = useState('');
  const [result, setResult] = useState('pending');
  const [notes, setNotes] = useState('');
  const queryClient = useQueryClient();

  const { data: betsRaw } = useQuery({
    queryKey: ['sportsBets'],
    queryFn: () => base44.entities.SportsBet.list('-created_date', 100),
    initialData: [],
  });
  const bets = Array.isArray(betsRaw) ? betsRaw : [];

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.SportsBet.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sportsBets'] });
      toast.success('Bet saved!');
      setDescription(''); setWager(''); setOdds(''); setNotes(''); setResult('pending');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SportsBet.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sportsBets'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SportsBet.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sportsBets'] }),
  });

  const wagerNum = parseFloat(wager) || 0;
  const potentialPayout = wagerNum > 0 && odds ? calcPayout(wagerNum, odds) : null;
  const potentialProfit = potentialPayout ? potentialPayout - wagerNum : null;

  const handleSave = () => {
    if (!wagerNum) { toast.error('Enter a wager amount'); return; }
    const payout = result === 'win' ? potentialPayout : result === 'push' ? wagerNum : result === 'loss' ? 0 : null;
    const net = payout !== null ? payout - wagerNum : null;
    saveMutation.mutate({
      sport,
      bet_type: betType,
      sportsbook,
      description: description || undefined,
      wager: wagerNum,
      odds: odds || undefined,
      potential_payout: potentialPayout || undefined,
      result,
      payout: payout !== null ? payout : undefined,
      net_profit: net !== null ? net : undefined,
      notes: notes || undefined,
      date: format(new Date(), 'yyyy-MM-dd'),
    });
  };

  const handleMarkResult = (bet, newResult) => {
    const payout = newResult === 'win' ? (bet.potential_payout || bet.wager) : newResult === 'push' ? bet.wager : 0;
    const net = payout - bet.wager;
    updateMutation.mutate({ id: bet.id, data: { result: newResult, payout, net_profit: net } });
  };

  // Stats
  const settled = bets.filter(b => b.result !== 'pending');
  const totalWagered = settled.reduce((s, b) => s + (b.wager || 0), 0);
  const totalNet = settled.reduce((s, b) => s + (b.net_profit || 0), 0);
  const wins = settled.filter(b => b.result === 'win').length;
  const winRate = settled.length > 0 ? Math.round((wins / settled.length) * 100) : 0;
  const pending = bets.filter(b => b.result === 'pending');

  return (
    <div className="space-y-4">
      {/* Stats */}
      {settled.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground">Bets</p>
            <p className="text-lg font-bold">{settled.length}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground">Net P&L</p>
            <p className={`text-lg font-bold ${totalNet >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {totalNet >= 0 ? '+' : ''}{formatCurrency(totalNet, user?.currency)}
            </p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground">Win %</p>
            <p className="text-lg font-bold">{winRate}%</p>
          </div>
        </div>
      )}

      {/* Input Card */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sport</label>
            <Select value={sport} onValueChange={setSport}>
              <SelectTrigger className="h-11 bg-background text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SPORTS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Bet Type</label>
            <Select value={betType} onValueChange={setBetType}>
              <SelectTrigger className="h-11 bg-background text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BET_TYPES.map(b => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1 col-span-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sportsbook</label>
            <Select value={sportsbook} onValueChange={setSportsbook}>
              <SelectTrigger className="h-11 bg-background text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SPORTSBOOKS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1 col-span-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</label>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Chiefs -3.5 vs Raiders"
              className="w-full h-11 bg-background border border-border rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              style={{ fontSize: 16 }}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Wager</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="number"
                value={wager}
                onChange={e => setWager(e.target.value)}
                placeholder="0.00"
                className="w-full h-11 bg-background border border-border rounded-xl pl-9 pr-3 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                style={{ fontSize: 16 }}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Odds</label>
            <input
              value={odds}
              onChange={e => setOdds(e.target.value)}
              placeholder="-110 or +250"
              className="w-full h-11 bg-background border border-border rounded-xl px-3 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              style={{ fontSize: 16 }}
            />
          </div>
        </div>

        {/* Payout Preview */}
        <AnimatePresence>
          {potentialPayout && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-center justify-between"
            >
              <span className="text-sm text-muted-foreground">Potential Payout</span>
              <div className="text-right">
                <span className="text-base font-bold text-primary">{formatCurrency(potentialPayout, user?.currency)}</span>
                <span className="text-xs text-primary ml-1">(+{formatCurrency(potentialProfit, user?.currency)})</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Result */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Result</label>
          <div className="grid grid-cols-4 gap-2">
            {['pending', 'win', 'loss', 'push'].map(r => (
              <button
                key={r}
                onClick={() => setResult(r)}
                className={`py-2 rounded-xl text-xs font-semibold border transition-all capitalize ${
                  result === r
                    ? r === 'win' ? 'bg-primary border-primary text-primary-foreground'
                      : r === 'loss' ? 'bg-destructive border-destructive text-destructive-foreground'
                      : r === 'push' ? 'bg-secondary border-border text-foreground'
                      : 'bg-muted border-border text-muted-foreground'
                    : 'border-border text-muted-foreground hover:border-foreground'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="w-full h-11 font-semibold bg-primary hover:bg-primary/90 rounded-xl"
        >
          <Save className="w-4 h-4 mr-2" />
          {saveMutation.isPending ? 'Saving...' : 'Save Bet'}
        </Button>
      </div>

      {/* Pending Bets */}
      {pending.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Pending ({pending.length})
          </h3>
          {pending.map(b => (
            <div key={b.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{b.description || `${SPORTS.find(s => s.value === b.sport)?.label} ${b.bet_type}`}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatCurrency(b.wager, user?.currency)} {b.odds && `@ ${b.odds}`}
                    {b.potential_payout && ` → ${formatCurrency(b.potential_payout, user?.currency)}`}
                  </p>
                </div>
                <div className="flex gap-2 ml-3">
                  <button onClick={() => handleMarkResult(b, 'win')} className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors">
                    <CheckCircle className="w-4 h-4 text-primary" />
                  </button>
                  <button onClick={() => handleMarkResult(b, 'loss')} className="p-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 transition-colors">
                    <XCircle className="w-4 h-4 text-destructive" />
                  </button>
                  <button onClick={() => deleteMutation.mutate(b.id)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Settled Bets */}
      {settled.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">Settled Bets</h3>
          {settled.slice(0, 10).map(b => (
            <div key={b.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold truncate">{b.description || SPORTS.find(s => s.value === b.sport)?.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize ${
                    b.result === 'win' ? 'bg-primary/10 text-primary' : b.result === 'push' ? 'bg-secondary text-foreground' : 'bg-destructive/10 text-destructive'
                  }`}>{b.result}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatCurrency(b.wager, user?.currency)} {b.odds && `@ ${b.odds}`}
                  {b.date && ` • ${format(new Date(b.date), 'MMM d')}`}
                </p>
              </div>
              <div className="flex items-center gap-3 ml-3 shrink-0">
                <span className={`text-sm font-bold ${(b.net_profit || 0) >= 0 ? 'text-primary' : 'text-destructive'}`}>
                  {(b.net_profit || 0) >= 0 ? '+' : ''}{formatCurrency(b.net_profit || 0, user?.currency)}
                </span>
                <button onClick={() => deleteMutation.mutate(b.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}