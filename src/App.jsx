import Home from "./Home";
import Admin from "./Admin";

export default function App() {
  const path = window.location.pathname.replace(/\/+$/, "");
  return path === "/home" ? <Home /> : <Admin />;
}
