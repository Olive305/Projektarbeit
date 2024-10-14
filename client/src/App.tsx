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
  const [setActiveMatrixFn, setSetActiveMatrixFn] = useState<((matrix: string) => void) | null>(null);

  useEffect(() => {
    // Initialize with a default graph if no graphs exist
    if (multiController.graphs.length === 0) {
      multiController.createNewGraph('New');
      setActiveTabIndex(0);
    }
  }, [multiController]);

  useEffect(() => {
    // Update the active graph controller whenever the active tab index changes
    const activeController = multiController.graphs[activeTabIndex]?.[0] ?? null; // Optional chaining
    console.log("active Tab:", activeController);
    setActiveGraphController(activeController);

    if (activeController) {
      activeController.notifyListeners();
    }
  }, [multiController, activeTabIndex]);

  // Update setActiveMatrix only when activeGraphController changes
  useEffect(() => {
    if (activeGraphController && activeGraphController.setActiveMatrix) {
      // If there's an active controller and setActiveMatrix exists, set the function
      setSetActiveMatrixFn(() => activeGraphController.setActiveMatrix);
    } else {
      // Fallback to an empty function to avoid null or undefined errors
      setSetActiveMatrixFn(() => {});
    }
  }, [activeGraphController]);

  const handleTabClick = (index: number) => {
    // Safely access the controller, using optional chaining
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
        saveGraphAs={multiController.saveGraphAs}
        saveAllGraphs={multiController.saveAllGraphs}
        activeTabIndex={activeTabIndex}
        setActiveMatrix={setActiveMatrixFn || (() => {})} // Fallback to empty function
      />
      <section>
        <div className='left-bar-div'>
          {activeGraphController && (
            <ControlBar
              controller={activeGraphController}
              multi={multiController}
              handleConvertToPetriNet={handleConvertToPetriNet}
            />
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
              <Canvas grid={true} controller={activeGraphController} multiController={multiController} />
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
