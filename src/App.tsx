import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Button } from './components/ui/button';
import keyIcon from './assets/key.png';
import closedChest from './assets/treasure_closed.png';
import treasureChest from './assets/treasure_opened.png';
import skeletonChest from './assets/treasure_opened_skeleton.png';
import chestOpenSound from './audios/chest_open.mp3';
import evilLaughSound from './audios/chest_open_with_evil_laugh.mp3';
import { initDb, insertScore, getLeaderboard, ScoreEntry } from './db';
import AuthScreen from './AuthScreen';

const SESSION_KEY = 'treasure_game_session';

interface Box {
  id: number;
  isOpen: boolean;
  hasTreasure: boolean;
}

export default function App() {
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [score, setScore] = useState(0);
  const [gameEnded, setGameEnded] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [isGuest, setIsGuest] = useState(false);
  const [leaderboard, setLeaderboard] = useState<ScoreEntry[]>([]);
  const [dbReady, setDbReady] = useState(false);
  const currentScoreRef = useRef(0);

  const initializeGame = () => {
    const treasureBoxIndex = Math.floor(Math.random() * 3);
    const newBoxes: Box[] = Array.from({ length: 3 }, (_, index) => ({
      id: index,
      isOpen: false,
      hasTreasure: index === treasureBoxIndex,
    }));
    setBoxes(newBoxes);
    setScore(0);
    setGameEnded(false);
  };

  // Initialize DB and restore session on mount
  useEffect(() => {
    initDb().then(() => {
      setDbReady(true);
      setLeaderboard(getLeaderboard());
      const savedSession = localStorage.getItem(SESSION_KEY);
      if (savedSession) {
        setPlayerName(savedSession);
        setIsGuest(false);
      }
    });
  }, []);

  // Start game after auth
  useEffect(() => {
    if (playerName) initializeGame();
  }, [playerName]);

  const handleLogin = (username: string) => {
    localStorage.setItem(SESSION_KEY, username);
    setIsGuest(false);
    setPlayerName(username);
    currentScoreRef.current = 0;
  };

  const handleGuest = () => {
    localStorage.removeItem(SESSION_KEY);
    setIsGuest(true);
    setPlayerName('訪客');
    currentScoreRef.current = 0;
  };

  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY);
    setPlayerName('');
    setIsGuest(false);
    setGameEnded(false);
    setBoxes([]);
    setScore(0);
    currentScoreRef.current = 0;
  };

  const openBox = (boxId: number) => {
    if (gameEnded) return;

    setBoxes(prevBoxes => {
      const targetBox = prevBoxes.find(box => box.id === boxId && !box.isOpen);
      if (targetBox) {
        const sound = targetBox.hasTreasure ? chestOpenSound : evilLaughSound;
        new Audio(sound).play();
      }

      const updatedBoxes = prevBoxes.map(box => {
        if (box.id === boxId && !box.isOpen) {
          const newScore = box.hasTreasure ? score + 250 : score - 50;
          currentScoreRef.current = newScore;
          setScore(newScore);
          return { ...box, isOpen: true };
        }
        return box;
      });

      const treasureFound = updatedBoxes.some(box => box.isOpen && box.hasTreasure);
      const allOpened = updatedBoxes.every(box => box.isOpen);
      if (treasureFound || allOpened) {
        setGameEnded(true);
        if (!isGuest) {
          insertScore(playerName, currentScoreRef.current);
          setLeaderboard(getLeaderboard());
        }
      }

      return updatedBoxes;
    });
  };

  const resetGame = () => {
    currentScoreRef.current = 0;
    initializeGame();
  };

  // Loading
  if (!dbReady) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-amber-100 flex items-center justify-center">
        <p className="text-amber-800 text-xl">Loading...</p>
      </div>
    );
  }

  // Auth screen
  if (!playerName) {
    return (
      <AuthScreen
        onLogin={handleLogin}
        onGuest={handleGuest}
        leaderboard={leaderboard}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-amber-100 flex flex-col items-center justify-center p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl mb-4 text-amber-900">🏴‍☠️ Treasure Hunt Game 🏴‍☠️</h1>
        <p className="text-amber-800 mb-1">
          Click on the treasure chests to discover what's inside!
        </p>
        <p className="text-amber-700 text-sm mb-3">
          💰 Treasure: +$250 | 💀 Skeleton: -$50
        </p>
        {/* Player info + logout */}
        <div className="flex items-center justify-center gap-3">
          <span className="text-amber-700 text-sm">
            {isGuest ? '👤 訪客' : `👤 ${playerName}`}
            {isGuest && <span className="ml-1 text-amber-500">(訪客模式)</span>}
          </span>
          <button
            onClick={handleLogout}
            className="text-xs text-amber-600 border border-amber-400 rounded px-2 py-1 hover:bg-amber-200 transition-colors"
          >
            {isGuest ? '返回登入' : '登出'}
          </button>
        </div>
      </div>

      {/* Score row */}
      <div className="mb-8 flex items-center gap-4">
        <div className="text-2xl text-center p-4 bg-amber-200/80 backdrop-blur-sm rounded-lg shadow-lg border-2 border-amber-400">
          <span className="text-amber-900">Current Score: </span>
          <span className={`${score >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${score}
          </span>
        </div>
        <div className="text-2xl text-center p-4 bg-amber-200/80 backdrop-blur-sm rounded-lg shadow-lg border-2 border-amber-400 min-w-[100px]">
          {gameEnded ? (
            <span className={`font-bold ${score > 0 ? 'text-green-600' : score < 0 ? 'text-red-600' : 'text-amber-700'}`}>
              {score > 0 ? '贏' : score < 0 ? '輸' : '平手'}
            </span>
          ) : (
            <span className="text-amber-300">-</span>
          )}
        </div>
      </div>

      {/* Boxes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        {boxes.map((box) => (
          <motion.div
            key={box.id}
            className="flex flex-col items-center"
            style={{ cursor: box.isOpen ? 'default' : `url(${keyIcon}) 16 16, pointer` }}
            whileHover={{ scale: box.isOpen ? 1 : 1.05 }}
            whileTap={{ scale: box.isOpen ? 1 : 0.95 }}
            onClick={() => openBox(box.id)}
          >
            <motion.div
              initial={{ rotateY: 0 }}
              animate={{
                rotateY: box.isOpen ? 180 : 0,
                scale: box.isOpen ? 1.1 : 1
              }}
              transition={{ duration: 0.6, ease: 'easeInOut' }}
              className="relative"
            >
              <img
                src={box.isOpen ? (box.hasTreasure ? treasureChest : skeletonChest) : closedChest}
                alt={box.isOpen ? (box.hasTreasure ? 'Treasure!' : 'Skeleton!') : 'Treasure Chest'}
                className="w-48 h-48 object-contain drop-shadow-lg"
              />
              {box.isOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="absolute -top-8 left-1/2 transform -translate-x-1/2"
                >
                  {box.hasTreasure ? (
                    <div className="text-2xl animate-bounce">✨💰✨</div>
                  ) : (
                    <div className="text-2xl animate-pulse">💀👻💀</div>
                  )}
                </motion.div>
              )}
            </motion.div>

            <div className="mt-4 text-center">
              {box.isOpen ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4, duration: 0.3 }}
                  className={`text-lg p-2 rounded-lg ${
                    box.hasTreasure
                      ? 'bg-green-100 text-green-800 border border-green-300'
                      : 'bg-red-100 text-red-800 border border-red-300'
                  }`}
                >
                  {box.hasTreasure ? '+$250' : '-$50'}
                </motion.div>
              ) : (
                <div className="text-amber-700 p-2">Click to open!</div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Game Over */}
      {gameEnded && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="mb-4 p-6 bg-amber-200/80 backdrop-blur-sm rounded-xl shadow-lg border-2 border-amber-400">
            <h2 className="text-2xl mb-2 text-amber-900">Game Over!</h2>
            <p className="text-lg text-amber-800">
              Final Score:{' '}
              <span className={`${score >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${score}
              </span>
            </p>
            <p className="text-sm text-amber-600 mt-2">
              {boxes.some(box => box.isOpen && box.hasTreasure)
                ? 'Treasure found! Well done, treasure hunter! 🎉'
                : 'No treasure found this time! Better luck next time! 💀'}
            </p>
            {isGuest && (
              <p className="text-xs text-amber-500 mt-2">訪客模式：分數未計入排行榜</p>
            )}
          </div>

          <Button
            onClick={resetGame}
            className="text-lg px-8 py-4 bg-amber-600 hover:bg-amber-700 text-white"
          >
            Play Again
          </Button>

          {!isGuest && leaderboard.length > 0 && (
            <div className="mt-6 w-full max-w-sm mx-auto">
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
                      <tr
                        key={i}
                        className={`border-t border-amber-300 ${
                          entry.playerName === playerName && entry.score === score
                            ? 'bg-amber-300/60 font-bold'
                            : 'text-amber-800'
                        }`}
                      >
                        <td className="py-2 px-3 text-amber-900">{i + 1}</td>
                        <td className="py-2 px-3 text-amber-900">{entry.playerName}</td>
                        <td className={`py-2 px-3 text-right ${entry.score >= 0 ? 'text-green-700' : 'text-red-700'}`}>
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
        </motion.div>
      )}
    </div>
  );
}
