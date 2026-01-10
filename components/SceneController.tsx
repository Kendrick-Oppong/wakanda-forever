"use client";

import { useState } from "react";
import { Hero } from "@/components/Hero";
import { GalaxyEntrance } from "@/components/GalaxyEntrance";
import { Loader } from "@/components/loader/Loader";

type Scene = "LOADING" | "HERO" | "CINEMATIC_ENTRANCE" | "MAIN_CONTENT";

export function SceneController() {
  const [currentScene, setCurrentScene] = useState<Scene>("LOADING");

  const renderScene = () => {
    switch (currentScene) {
      case "LOADING":
        return (
          <>
            <Hero startAnimations={false} onEnter={() => {}} />
            <Loader onComplete={() => setCurrentScene("HERO")} />
          </>
        );

      case "HERO":
        return <Hero onEnter={() => setCurrentScene("CINEMATIC_ENTRANCE")} />;

      case "CINEMATIC_ENTRANCE":
        return (
          <>
            <Hero onEnter={() => {}} />
            <GalaxyEntrance />
          </>
        );

      default:
        return <Loader onComplete={() => setCurrentScene("HERO")} />;
    }
  };

  return <>{renderScene()}</>;
}
