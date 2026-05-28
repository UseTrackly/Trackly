import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, TrendingUp, TrendingDown, Save, Trash2, Clock } from 'lucide-react';
import { formatCurrency } from '@/lib/currencyFormatter';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { format } from 'date-fns';

const GAMES = [
  { value: 'poker', label: '🃏 Poker' },
  { value: 'blackjack', label: '🂡 Blackjack' },
  { value: 'roulette', label: '🎡 Roulette' },
  { value: 'slots', label: '🎰 Slots' },
  { value: 'craps', label: '🎲 Craps' },
  { value: 'baccarat', label: '🎴 Baccarat' },
  { value: 'sports_book', label: '🏟️ Sports Book' },
  { value: 'other', label: '🎯 Other' },
];

export default function CasinoTracker({ user }) {
  const [gameType, setGameType] = useState('poker');
  const [venue, setVenue] = useState('');
  const [buyIn, setBuyIn] = useState('');
  const [cashOut, setCashOut] = useState('');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const queryClient = useQueryClient();

  const { data: sessionsRaw } = useQuery({
    queryKey: ['casinoSessions'],
    queryFn: () => base44.entities.CasinoSession.list('-created_date', 50),
    initialData: [],
  });
  const sessions = Array.isArray(sessionsRaw) ? sessionsRaw : [];

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.CasinoSession.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['casinoSessions'] });
      toast.success('Session saved!');
      setBuyIn(''); setCashOut(''); setVenue(''); setDuration(''); setNotes('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CasinoSession.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['casinoSessions'] }),
  });

  const buyInNum = parseFloat(buyIn) || 0;
  const cashOutNum = parseFloat(cashOut) || 0;
  const netProfit = cashOutNum - buyInNum;
  const hasResult = buyInNum > 0 && cashOut !== '';

  const handleSave = () => {
    if (!buyInNum) { toast.error('Enter a buy-in amount'); return; }
    if (cashOut === '') { toast.error('Enter cash-out amount'); return; }
    saveMutation.mutate({
      game_type: gameType,
      venue: venue || undefined,
      buy_in: buyInNum,
      cash_out: cashOutNum,
      net_profit: netProfit,
      duration_hours: parseFloat(duration) || undefined,
      notes: notes || undefined,
      date: format(new Date(), 'yyyy-MM-dd'),
    });
  };

  const totalNet = sessions.reduce((s, x) => s + (x.net_profit || 0), 0);
  const wins = sessions.filter(s => s.net_profit > 0).length;

  return (
    <div className="space-y-4">
      {/* Stats Bar */}
      {sessions.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground">Sessions</p>
            <p className="text-lg font-bold">{sessions.length}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground">Net P&L</p>
            <p className={`text-lg font-bold ${totalNet >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {totalNet >= 0 ? '+' : ''}{formatCurrency(totalNet, user?.currency)}
            </p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground">Win Rate</p>
            <p className="text-lg font-bold">{sessions.length > 0 ? Math.round((wins / sessions.length) * 100) : 0}%</p>
          </div>
        </div>
      )}

      {/* Input Card */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {/* Game Type */}
          <div className="space-y-1 col-span-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Game</label>
            <Select value={gameType} onValueChange={setGameType}>
              <SelectTrigger className="h-11 bg-background text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GAMES.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Venue */}
          <div className="space-y-1 col-span-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Venue (Optional)</label>
            <input
              value={venue}
              onChange={e => setVenue(e.target.value)}
              placeholder="e.g. Bellagio, Home game"
              className="w-full h-11 bg-background border border-border rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              style={{ fontSize: 16 }}
            />
          </div>

          {/* Buy In */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Buy In</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="number"
                value={buyIn}
                onChange={e => setBuyIn(e.target.value)}
                placeholder="0.00"
                className="w-full h-11 bg-background border border-border rounded-xl pl-9 pr-3 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                style={{ fontSize: 16 }}
              />
            </div>
          </div>

          {/* Cash Out */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cash Out</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="number"
                value={cashOut}
                onChange={e => setCashOut(e.target.value)}
                placeholder="0.00"
                className="w-full h-11 bg-background border border-border rounded-xl pl-9 pr-3 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                style={{ fontSize: 16 }}
              />
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Hours Played</label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="number"
                value={duration}
                onChange={e => setDuration(e.target.value)}
                placeholder="0"
                className="w-full h-11 bg-background border border-border rounded-xl pl-9 pr-3 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                style={{ fontSize: 16 }}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Notes</label>
            <input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Optional..."
              className="w-full h-11 bg-background border border-border rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              style={{ fontSize: 16 }}
            />
          </div>
        </div>

        {/* Result Preview */}
        <AnimatePresence>
          {hasResult && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={`rounded-xl p-4 text-center border-2 ${netProfit >= 0 ? 'bg-primary/5 border-primary/30' : 'bg-destructive/5 border-destructive/30'}`}
            >
              <p className="text-xs text-muted-foreground mb-1">Session Result</p>
              <div className="flex items-center justify-center gap-2">
                {netProfit >= 0 ? <TrendingUp className="w-5 h-5 text-primary" /> : <TrendingDown className="w-5 h-5 text-destructive" />}
                <p className={`text-3xl font-bold ${netProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                  {netProfit >= 0 ? '+' : ''}{formatCurrency(netProfit, user?.currency)}
                </p>
              </div>
              {duration && buyInNum > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {formatCurrency(Math.abs(netProfit / parseFloat(duration)), user?.currency)}/hr
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="w-full h-11 font-semibold bg-primary hover:bg-primary/90 rounded-xl"
        >
          <Save className="w-4 h-4 mr-2" />
          {saveMutation.isPending ? 'Saving...' : 'Save Session'}
        </Button>
      </div>

      {/* Recent Sessions */}
      {sessions.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">Recent Sessions</h3>
          {sessions.slice(0, 10).map(s => (
            <div key={s.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold capitalize">{GAMES.find(g => g.value === s.game_type)?.label || s.game_type}</span>
                  {s.venue && <span className="text-xs text-muted-foreground truncate">@ {s.venue}</span>}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground">In: {formatCurrency(s.buy_in, user?.currency)}</span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">Out: {formatCurrency(s.cash_out, user?.currency)}</span>
                  {s.date && <span className="text-xs text-muted-foreground">• {format(new Date(s.date), 'MMM d')}</span>}
                </div>
              </div>
              <div className="flex items-center gap-3 ml-3 shrink-0">
                <span className={`text-sm font-bold ${s.net_profit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                  {s.net_profit >= 0 ? '+' : ''}{formatCurrency(s.net_profit, user?.currency)}
                </span>
                <button onClick={() => deleteMutation.mutate(s.id)} className="text-muted-foreground hover:text-destructive transition-colors">
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