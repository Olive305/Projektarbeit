import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    // Initialize with a default graph if no graphs exist
    if (multiController.graphs.length === 0) {
      multiController.createNewGraph('New');
      setActiveTabIndex(0);
    }
  }, [multiController]);

  useEffect(() => {
    // Update the active graph controller whenever the active tab index changes
    const activeController = multiController.graphs[activeTabIndex]?.[0] ?? null;
    setActiveGraphController(activeController);
  }, [multiController, activeTabIndex]);

  const handleTabClick = (index: number) => {
    // Directly update the active graph controller before setting the active tab index
    const controller = multiController.graphs[index][0];
    setActiveGraphController(controller);
  
    // Set the active tab index
    setActiveTabIndex(index);
  
    // Notify listeners immediately after the state update
    controller.notifyListeners();
  };

  const handleConvertToPetriNet = (index: number) => {
    const newIndex = multiController.convertToPetriNet(index);
    setActiveTabIndex(newIndex); // Set the new Petri Net tab as the active tab
  };
  

  return (
    <>
      <Header
        createNewGraph={(name: string) => {
          multiController.createNewGraph(name);
          setActiveTabIndex(multiController.graphs.length - 1); // Set new tab as active
        }}
        readGraphFromFile={async (file: File) => {
          await multiController.readGraphFromFile(file);
          setActiveTabIndex(multiController.graphs.length - 1); // Set new tab as active
        }}
        saveGraphAs={(index: number) => multiController.saveGraphAs(index)}
        saveAllGraphs={() => multiController.saveAllGraphs()}
        activeTabIndex={activeTabIndex}
        handleConvertToPetriNet={handleConvertToPetriNet}
      />
      <section>
        <div className='left-bar-div'>
          {activeGraphController && <ControlBar controller={activeGraphController} multi={multiController} handleConvertToPetriNet={handleConvertToPetriNet}/>}
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
            {activeGraphController && <Canvas grid={true} controller={activeGraphController} multiController={multiController} />}
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
