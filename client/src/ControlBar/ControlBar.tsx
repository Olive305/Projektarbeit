import React, { useState } from 'react';
import GraphController from './GraphController';
import './ControlBar.css'
import MultiGraphs from './MultiGraphs';
import axios from 'axios';




interface ControlsProps {
  controller: GraphController
  multi: MultiGraphs;
  handleConvertToPetriNet: (index: number) => void;
}

const ControlBar: React.FC<ControlsProps> = ({ controller, multi, handleConvertToPetriNet }) => {
  // State to hold the slider value
  const [sliderValue, setSliderValue] = useState(controller.probabilityMin * 100);
  const [isChecked, setIsChecked] = useState(controller.auto); // State to manage checkbox status

  // Function to handle slider value changes
  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSliderValue(Number(event.target.value));
    // You can pass the value to controller if needed here
    controller.probabilityMin = sliderValue / 100;
    controller.get_preview_nodes();
  };

  return (
    <div>
      {/* Slider */}
      <div className="slidecontainer">
        <input
          type="range"
          min="0"
          max="100"
          value={sliderValue}
          className="slider"
          id="myRange"
          style={{ background: isChecked ? 'lightgray' : 'lightblue' }}
          onChange={handleSliderChange}
        />
        <p>Probability: {sliderValue}</p> {/* Display the current slider value */}
      </div>

      <div>
        <label>
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(event) => {
                controller.auto = !controller.auto;
                setIsChecked(event.target.checked);
                controller.get_preview_nodes();
              }
            } // Handle checkbox change
          />
          Auto Probability
        </label>
      </div>

      <button className='test-Button' onClick={() => controller.deleteSelectedNodes()}>
        <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="currentColor" className="bi bi-trash" viewBox="0 0 16 16">
          <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
          <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
        </svg>
      </button>

      <button className='test-Button' onClick={() => multi.copySelectedNodes(multi.getIndexOf(controller))}>
        Copy
      </button>

      <button className='test-Button' onClick={() => multi.pasteNodesIntoGraph(multi.getIndexOf(controller))}>
        Paste
      </button>

      <button className='test-Button' onClick={async () => console.log(handleConvertToPetriNet(multi.getIndexOf(controller)))}>
        To PetriNet
      </button>
    </div>);
}

export default ControlBar;
