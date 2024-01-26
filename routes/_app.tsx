import { AppProps } from "$fresh/server.ts";
import GlobalTags from "../components/GlobalTags.tsx";

const trackingId = "";

function App(props: AppProps) {
  return (
    <>
      {/* Include fonts, icons and more */}
      <GlobalTags />

      {/* Rest of Preact tree */}
      <props.Component />
    </>
  );
}

export default App;
