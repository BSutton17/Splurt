import { useEffect, useState } from 'react';
import './App.css';
import { io } from 'socket.io-client';
import rules from './Letter.json';
import prompts from './Promps.json';
import { keepServerAwake } from './keepAwake.js';

// `npm run dev` talks to a local server, a production build to Heroku.
// Set VITE_SERVER_URL to point either one somewhere else.
const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ||
  (import.meta.env.DEV ? "http://localhost:3001" : "https://splurt-b6574522f3ab.herokuapp.com");

const socket = io(SERVER_URL);

// A per-tab id that survives reloads, so the server hands a dropped player
// their score back instead of seating a new player at 0.
const PLAYER_ID_KEY = "splurt:playerId";
const PLAYER_NAME_KEY = "splurt:playerName";

function readStorage(key) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // storage blocked (private mode) - the id just won't survive a reload
  }
}

function getPlayerId() {
  let id = readStorage(PLAYER_ID_KEY);
  if (!id) {
    id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    writeStorage(PLAYER_ID_KEY, id);
  }
  return id;
}

const myPlayerId = getPlayerId();

function App() {
  const [prompt, setPrompt] = useState("Waiting for host");
  const [rule, setRule] = useState("");
  const [password, setPassword] = useState("");
  const [admin, isAdmin] = useState(false)
  const [availableRules, setAvailableRules] = useState([]);
  const [availablePrompts, setAvailablePrompts] = useState([]);
  const [playerName, setPlayerName] = useState(() => readStorage(PLAYER_NAME_KEY) || "");
  const [players, setPlayers] = useState([]);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    socket.on("updatePrompt", (newPrompt) => {
      setPrompt(newPrompt);
      setRule(""); // Clear rule when new prompt arrives
    });

    socket.on("updateRule", (newRule) => {
      setRule(newRule);
    });

    socket.on("updatePlayers", (playersList) => {
      setPlayers(playersList);
    });

    // Every (re)connect re-announces us, so a dropped phone keeps its score.
    const rejoin = () => {
      const savedName = readStorage(PLAYER_NAME_KEY);
      if (savedName) {
        socket.emit("joinGame", { name: savedName, playerId: myPlayerId });
      }
    };
    socket.on("connect", rejoin);
    if (socket.connected) rejoin();

    return () => {
      socket.off("updatePrompt");
      socket.off("updateRule");
      socket.off("updatePlayers");
      socket.off("connect", rejoin);
    };
  }, []);

  // Splurt has no lobby - an open page is the game. keepServerAwake stops on
  // its own once nothing has happened for a while.
  useEffect(() => keepServerAwake(SERVER_URL, socket), []);

  useEffect(() => {
    setAvailableRules([...rules]);
    setAvailablePrompts([...prompts]);
  }, []);


  useEffect(()=>{
    if(password=="5648"){
      isAdmin(true);
    }
    else{
      isAdmin(false);
    }
  },[password])

  const changeRule = () => {
    socket.emit("ruleChange", { prompts, rules });
  };

  const handleNameSubmit = (e) => {
    if (e.key === 'Enter' && playerName.trim()) {
      writeStorage(PLAYER_NAME_KEY, playerName.trim());
      socket.emit("joinGame", { name: playerName.trim(), playerId: myPlayerId });
    }
  };

  const updateScore = (playerId, delta) => {
    socket.emit("updateScore", { playerId, delta });
  };

  return (
    <div className={darkMode ? 'dark-mode' : ''}>
      <div className="players-container">
        {players.map((player) => (
          <div key={player.id} className={`player-card ${player.connected === false ? "offline" : ""}`}>
            <span className="player-name">{player.name}</span>
            <div className="score-container">
              <span className="player-score">{player.score}</span>
              {admin && (
                <div className="score-buttons">
                  <button onClick={() => updateScore(player.id, 1)}>+</button>
                  <button onClick={() => updateScore(player.id, -1)}>-</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="top-bar">
        <div className="title-container">
          <h1 className="title">SPLURT</h1>
        </div>
        <input 
          className="name-input"
          placeholder="Enter name here" 
          value={playerName} 
          onChange={(e) => setPlayerName(e.target.value)}
          onKeyDown={handleNameSubmit}
        />
      </div>
  
      <div className="container">
        <h1 className="prompt">{prompt}{!rule && <span>...</span>}</h1>
        {rule && <h2 className="rule">{rule}</h2>}
        {admin && <button onClick={changeRule}>Change Rule</button>}
      </div>
      <input className="admin-password" value={password} onChange={(e)=>setPassword(e.target.value)}/>
      <button className="dark-mode-toggle" onClick={() => setDarkMode(!darkMode)}>
        {darkMode ? '☀️' : '🌙'}
      </button>
    </div>
  );
  
}

export default App;
