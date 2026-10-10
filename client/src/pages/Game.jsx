import { useParams } from 'react-router-dom';
import GamePlayer from '../components/GamePlayer';

export default function Game() {
  const { id } = useParams();
  return <GamePlayer key={id} gameId={id} showBack />;
}
