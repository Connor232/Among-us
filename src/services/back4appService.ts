
import Parse from 'parse';

const APP_ID = import.meta.env.VITE_BACK4APP_APP_ID;
const JS_KEY = import.meta.env.VITE_BACK4APP_JS_KEY;

export const initBack4App = () => {
  if (APP_ID && JS_KEY) {
    Parse.initialize(APP_ID, JS_KEY);
    Parse.serverURL = 'https://parseapi.back4app.com/';
    console.log('Back4App initialized');
  } else {
    console.warn('Back4App credentials missing. Skipping initialization.');
  }
};

export interface PlayerStats {
  playerName: string;
  totalGames: number;
  totalWins: number;
  totalKills: number;
  tasksCompleted: number;
}

export const savePlayerStats = async (stats: PlayerStats) => {
  if (!APP_ID || !JS_KEY) return;

  const PlayerStatsClass = Parse.Object.extend('PlayerStats');
  const query = new Parse.Query(PlayerStatsClass);
  query.equalTo('playerName', stats.playerName);
  
  try {
    let playerStats: Parse.Object;
    const existing = await query.first();
    
    if (!existing) {
      playerStats = new PlayerStatsClass();
      playerStats.set('playerName', stats.playerName);
      playerStats.set('totalGames', 0);
      playerStats.set('totalWins', 0);
      playerStats.set('totalKills', 0);
      playerStats.set('tasksCompleted', 0);
    } else {
      playerStats = existing;
    }

    const currentGames = playerStats.get('totalGames') || 0;
    const currentWins = playerStats.get('totalWins') || 0;
    const currentKills = playerStats.get('totalKills') || 0;
    const currentTasks = playerStats.get('tasksCompleted') || 0;

    playerStats.set('totalGames', currentGames + stats.totalGames);
    playerStats.set('totalWins', currentWins + stats.totalWins);
    playerStats.set('totalKills', currentKills + stats.totalKills);
    playerStats.set('tasksCompleted', currentTasks + stats.tasksCompleted);

    await playerStats.save();
    console.log('Stats saved to Back4App');
  } catch (error) {
    console.error('Error saving stats to Back4App:', error);
  }
};

export const getLeaderboard = async () => {
  if (!APP_ID || !JS_KEY) return [];

  const PlayerStatsClass = Parse.Object.extend('PlayerStats');
  const query = new Parse.Query(PlayerStatsClass);
  query.descending('totalWins');
  query.limit(10);

  try {
    const results = await query.find();
    return results.map(r => ({
      playerName: r.get('playerName') as string,
      totalGames: r.get('totalGames') as number,
      totalWins: r.get('totalWins') as number,
      totalKills: r.get('totalKills') as number,
      tasksCompleted: r.get('tasksCompleted') as number,
    }));
  } catch (error) {
    console.error('Error fetching leaderboard from Back4App:', error);
    return [];
  }
};
