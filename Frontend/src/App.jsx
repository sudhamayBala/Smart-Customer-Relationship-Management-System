import AppRoutes from "./routes/AppRoute";
import AuthInitializer from "./components/AuthInitializer";

function App() {
  return (
    <AuthInitializer>
      <AppRoutes />
    </AuthInitializer>
  );
}

export default App;