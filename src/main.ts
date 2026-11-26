import './styles/main.css';
import { GameManager } from './GameManager';

const root = document.getElementById('game-root');
if (root) {
  new GameManager(root);
}
