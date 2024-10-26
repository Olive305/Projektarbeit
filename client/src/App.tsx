import React, { useState, useEffect, useCallback } from 'react';
import Header from './Header/Header';
import Canvas from './Canvas/Canvas';
import { createRoot } from 'react-dom/client';
import ControlBar from './ControlBar/ControlBar';
import GraphController from './ControlBar/GraphController';
import MultiController from './ControlBar/MultiGraphs';
import './App.css';

const App: React.FC = () => {
  const gridSize = 20;
  const [multiController] = useState(new MultiController(gridSize));
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [activeGraphController, setActiveGraphController] = useState<GraphController | null>(null);
  const [setActiveMatrixFn, setSetActiveMatrixFn] = useState<((matrix: string) => void) | null>(null);
  const [rainbowPredictions, setRainbowPredictions] = useState(true);

  useEffect(() => {
    if (multiController.graphs.length === 0) {
      multiController.createNewGraph('New');
      setActiveTabIndex(0);
    }
  }, [multiController]);

  useEffect(() => {
    activeGraphController?.notifyListeners();
  }, [activeGraphController]);

  useEffect(() => {
    const activeController = multiController.graphs[activeTabIndex]?.[0] ?? null;
    setActiveGraphController(activeController);
    if (activeController) {
      activeController.notifyListeners();
    }
  }, [multiController, activeTabIndex]);

  useEffect(() => {
    if (activeGraphController && activeGraphController.setActiveMatrix) {
      setSetActiveMatrixFn(() => activeGraphController.setActiveMatrix);
    } else {
      setSetActiveMatrixFn(() => {});
    }
  }, [activeGraphController]);

  const handleTabClick = (index: number) => {
    const controller = multiController.graphs[index]?.[0];
    if (controller) {
      setActiveGraphController(controller);
      setActiveTabIndex(index);
      controller.notifyListeners();
    } else {
      console.error('Controller is undefined or null');
    }
  };

  const handleConvertToPetriNet = (index: number) => {
    const newIndex = multiController.convertToPetriNet(index);
    setActiveTabIndex(newIndex);
  };

  const handleCreateNewGraph = (name: string) => {
    multiController.createNewGraph(name);
    setActiveTabIndex(multiController.graphs.length - 1);
  };

  const handleReadGraphFromFile = async (file: File) => {
    await multiController.readGraphFromFile(file);
    setActiveTabIndex(multiController.graphs.length - 1);
  };

  return (
    <>
      <Header
        createNewGraph={handleCreateNewGraph}
        readGraphFromFile={handleReadGraphFromFile}
        saveGraph={() => multiController.saveGraph(activeTabIndex)}
        saveAllGraphs={multiController.saveAllGraphs}
        activeTabIndex={activeTabIndex}
        setActiveMatrix={setActiveMatrixFn || (() => {})}
        toggleRainbowPredictions={() => setRainbowPredictions(!rainbowPredictions)}
        handleToPetriNet={() => handleConvertToPetriNet(activeTabIndex)}
      />
      <section className='workspace'>
        <div className='left-bar-div'>
          {activeGraphController && (
            <ControlBar controller={activeGraphController} multi={multiController} />
          )}
        </div>
        <section className='workspace-section'>
          <div className='tabs-div'>
            {multiController.graphs.map(([_, name], index) => (
              <button
                key={index}
                className={`tab-button ${index === activeTabIndex ? 'active' : ''}`}
                onClick={() => handleTabClick(index)}
              >
                {name}
              </button>
            ))}
          </div>
          <div className='canvas-div'>
            {activeGraphController && (
              <Canvas controller={activeGraphController} rainbowPredictions={rainbowPredictions}/>
            )}
          </div>
        </section>
      </section>
    </>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
} else {
  console.error("Could not find root container element.");
}

export default App;
