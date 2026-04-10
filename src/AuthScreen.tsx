import { useState } from 'react';
import { Button } from './components/ui/button';
import { registerUser, loginUser, ScoreEntry } from './db';

interface AuthScreenProps {
  onLogin: (username: string) => void;
  onGuest: () => void;
  leaderboard: ScoreEntry[];
}

export default function AuthScreen({ onLogin, onGuest, leaderboard }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const switchMode = (next: 'login' | 'register') => {
    setMode(next);
    setError('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async () => {
    setError('');
    if (!username.trim() || !password) return;

    if (mode === 'register') {
      if (username.trim().length < 2) {
        setError('帳號至少需要 2 個字元');
        return;
      }
      if (password.length < 4) {
        setError('密碼至少需要 4 個字元');
        return;
      }
      if (password !== confirmPassword) {
        setError('兩次密碼不一致');
        return;
      }
      setLoading(true);
      const result = await registerUser(username.trim(), password);
      setLoading(false);
      if (result.success) {
        onLogin(username.trim());
      } else {
        setError(result.error ?? '註冊失敗');
      }
    } else {
      setLoading(true);
      const result = await loginUser(username.trim(), password);
      setLoading(false);
      if (result.success) {
        onLogin(username.trim());
      } else {
        setError(result.error ?? '登入失敗');
      }
    }
  };

  const inputClass =
    'w-full px-4 py-2 rounded-lg border-2 border-amber-400 bg-amber-50 text-amber-900 outline-none focus:border-amber-600 transition-colors';

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-amber-100 flex flex-col items-center justify-center p-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl mb-2 text-amber-900">🏴‍☠️ Treasure Hunt Game 🏴‍☠️</h1>
        <p className="text-amber-700 text-sm">💰 Treasure: +$100 | 💀 Skeleton: -$50</p>
      </div>

      <div className="bg-amber-200/80 backdrop-blur-sm rounded-xl shadow-lg border-2 border-amber-400 p-8 w-full max-w-sm">
        {/* Mode toggle */}
        <div className="flex mb-6 rounded-lg overflow-hidden border-2 border-amber-400">
          <button
            onClick={() => switchMode('login')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              mode === 'login'
                ? 'bg-amber-500 text-white'
                : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
            }`}
          >
            登入
          </button>
          <button
            onClick={() => switchMode('register')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              mode === 'register'
                ? 'bg-amber-500 text-white'
                : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
            }`}
          >
            註冊
          </button>
        </div>

        {/* Form */}
        <div className="space-y-3 mb-4">
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="帳號"
            className={inputClass}
            maxLength={20}
            autoComplete="username"
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                if (mode === 'register' && !confirmPassword) return;
                handleSubmit();
              }
            }}
            placeholder="密碼"
            className={inputClass}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
          {mode === 'register' && (
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="確認密碼"
              className={inputClass}
              autoComplete="new-password"
            />
          )}
        </div>

        {error && (
          <p className="text-red-600 text-sm mb-3 text-center bg-red-50 py-2 rounded-lg border border-red-200">
            {error}
          </p>
        )}

        <Button
          onClick={handleSubmit}
          disabled={!username.trim() || !password || loading}
          className="w-full text-lg py-3 bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50 mb-4"
        >
          {loading ? '處理中...' : mode === 'login' ? '登入' : '註冊'}
        </Button>

        {/* Divider */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 h-px bg-amber-400" />
          <span className="text-amber-600 text-xs">或</span>
          <div className="flex-1 h-px bg-amber-400" />
        </div>

        {/* Guest button */}
        <button
          onClick={onGuest}
          className="w-full py-2 text-amber-700 border-2 border-amber-400 rounded-lg hover:bg-amber-300/50 transition-colors text-sm"
        >
          以訪客身分遊玩
          <span className="block text-xs text-amber-500 mt-0.5">（分數不計入排行榜）</span>
        </button>
      </div>

      {/* Leaderboard preview */}
      {leaderboard.length > 0 && (
        <div className="mt-8 w-full max-w-sm">
          <h3 className="text-xl text-amber-900 mb-3 text-center">🏆 排行榜</h3>
          <div className="bg-amber-200/80 backdrop-blur-sm rounded-xl border-2 border-amber-400 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-amber-400/50 text-amber-900">
                  <th className="py-2 px-3 text-left">#</th>
                  <th className="py-2 px-3 text-left">玩家</th>
                  <th className="py-2 px-3 text-right">分數</th>
                  <th className="py-2 px-3 text-right">日期</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, i) => (
                  <tr key={i} className="border-t border-amber-300 text-amber-800">
                    <td className="py-2 px-3">{i + 1}</td>
                    <td className="py-2 px-3">{entry.playerName}</td>
                    <td className={`py-2 px-3 text-right font-bold ${entry.score >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      ${entry.score}
                    </td>
                    <td className="py-2 px-3 text-right text-amber-600">{entry.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
