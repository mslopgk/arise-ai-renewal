import Shell from "../Shell";
import Aura from "../sections/Aura";
import AuraSignature from "../sections/AuraSignature";
import AuraFilm from "../sections/AuraFilm";
import Framework from "../sections/Framework";
import Achievements from "../sections/Achievements";
import Services from "../sections/Services";
import Roadmap from "../sections/Roadmap";

export default function Page() {
  return (
    <Shell>
      <Aura />
      <AuraSignature />
      <AuraFilm />
      <Framework />
      <Achievements />
      <Services />
      <Roadmap />
    </Shell>
  );
}
