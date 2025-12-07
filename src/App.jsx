import { useEffect, useState } from 'react';
import './App.css';
import { io } from 'socket.io-client';
import rules from './Letter.json';
import prompts from './Promps.json';

const socket = io("https://splurt-b6574522f3ab.herokuapp.com/"); 
function App() {
  const [prompt, setPrompt] = useState("Waiting for host");
  const [rule, setRule] = useState("");
  const [password, setPassword] = useState("");
  const [admin, isAdmin] = useState(false)
  const [availableRules, setAvailableRules] = useState([]);
  const [availablePrompts, setAvailablePrompts] = useState([]);
  const [playerName, setPlayerName] = useState("");
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

    return () => {
      socket.off("updatePrompt");
      socket.off("updateRule");
      socket.off("updatePlayers");
    };
  }, []);

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
      socket.emit("joinGame", playerName.trim());
    }
  };

  const updateScore = (playerId, delta) => {
    socket.emit("updateScore", { playerId, delta });
  };

  return (
    <div className={darkMode ? 'dark-mode' : ''}>
      <div className="players-container">
        {players.map((player) => (
          <div key={player.id} className="player-card">
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
          onKeyPress={handleNameSubmit}
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
