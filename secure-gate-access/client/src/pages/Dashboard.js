import { useParams } from "react-router-dom";

export default function Dashboard() {
  const { role } = useParams();
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome, {role}!</p>
    </div>
  );
}
