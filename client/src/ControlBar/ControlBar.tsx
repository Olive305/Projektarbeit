import React, { useState } from 'react';
import GraphController from './GraphController';
import './ControlBar.css'
import MultiGraphs from './MultiGraphs';

interface ControlsProps {
  controller: GraphController
  multi: MultiGraphs;
}

const ControlBar: React.FC<ControlsProps> = ({ controller }) => {
  // State to hold the slider value
  const [sliderValue, setSliderValue] = useState(controller.probabilityMin * 100);
  const [isChecked, setIsChecked] = useState(controller.auto); // State to manage checkbox status

  const [fitness, setFitness] = useState(0);
  const [precision, setPrecision] = useState(0);
  const [simplicity, setSimplicity] = useState(0);
  const [generalization, setGeneralization] = useState(0);

  controller.setMetricsChange(setFitness, setPrecision, setSimplicity, setGeneralization);

  // Function to handle slider value changes (but doesn't trigger preview)
  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    setSliderValue(value);
  };

  // Function to trigger preview nodes when the slider interaction is complete
  const handleSliderMouseUp = () => {
    controller.probabilityMin = sliderValue / 100;
    controller.get_preview_nodes();
  };

  return (
    <div>
      {/* Conditionally render the slider based on the checkbox state */}

      <label>Metrics</label>
      <div>
        <label>Fitness:</label>
        <progress id="fitness" value={fitness * 100} max="100">{fitness * 100}%</progress>

        <label>Simplicity:</label>
        <progress id="simplicity" value={simplicity * 100} max="100">{simplicity * 100}%</progress>

        <label>Precision:</label>
        <progress id="precision" value={precision * 100} max="100">{precision * 100}%</progress>

        <label>Generalization:</label>
        <progress id="generalization" value={generalization * 100} max="100">{generalization * 100}%</progress>
      </div>
      <div>
        <label>
          <input
            className='checkbox'
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

      {!isChecked && (
        <div className="slidecontainer">
          <p>Probability: {sliderValue}</p> {/* Display the current slider value */}
          <input
            type="range"
            min="0"
            max="100"
            value={sliderValue}
            className="slider"
            id="myRange"
            style={{ background: 'lightblue' }}
            onChange={handleSliderChange} // Only updates the slider value
            onMouseUp={handleSliderMouseUp} // Trigger action on mouse release
          />
        </div>
      )}
    </div>
  );
}

export default ControlBar;
