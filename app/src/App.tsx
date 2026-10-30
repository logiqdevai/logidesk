import { RouterProvider } from "react-router-dom";
import QueryProvider from "./components/providers/query-provider.tsx";
import { Toaster } from "./components/ui/toaster.tsx";
import { RadixPointerEventsGuard } from "./components/providers/radix-pointer-events-guard.tsx";
import { router } from "./routes";

function App() {
  return (
    <QueryProvider>
      <RouterProvider router={router} />
      <Toaster />
      <RadixPointerEventsGuard />
    </QueryProvider>
  );
}

export default App;
