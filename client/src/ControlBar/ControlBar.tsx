import React, { useState } from "react";
import GraphController from "./GraphController";
import "./ControlBar.css";
import MultiGraphs from "./MultiGraphs";

interface ControlsProps {
	controller: GraphController;
	multi: MultiGraphs;
	activeName: string;
	setActiveName: (name: string) => void;
	fitness: any;
	simplicity: any;
	precision: any;
	generalization: any;
}

const ControlBar: React.FC<ControlsProps> = ({
	controller,
	activeName,
	setActiveName,
	fitness,
	precision,
	generalization,
	simplicity,
}) => {
	// State to hold the slider value
	const [sliderValue, setSliderValue] = useState(
		controller.probabilityMin * 100
	);
	const [isChecked, setIsChecked] = useState(controller.auto); // State to manage checkbox status

	// Function to handle slider value changes
	const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const value = Number(event.target.value);
		setSliderValue(value);
	};

	// Trigger preview nodes when the slider interaction is complete
	const handleSliderMouseUp = () => {
		controller.probabilityMin = sliderValue / 100;
		controller.get_preview_nodes();
	};

	// Update process name on input change
	const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		setActiveName(event.target.value);
	};

	// Handle checkbox change
	const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		controller.auto = event.target.checked;
		setIsChecked(event.target.checked);
		controller.get_preview_nodes();
	};

	return (
		<div>
			<div className="processNameContainer">
				<label
					htmlFor="processName"
					className="label">
					Process:
				</label>
				<input
					type="text"
					id="processName"
					value={activeName}
					onChange={handleNameChange}
					placeholder="Enter process name"
					className="input"
				/>
			</div>

			<hr className="my-2" />

			{/* Conditionally render performance metrics */}
			{controller.showPreview && (
				<>
					<div className="performanceMetrics">
						<div className="metric">
							<label>Fitness: {fitness ? Math.round(fitness * 100) : 0}%</label>
							<progress
								value={fitness}
								max="1"
								className="progressBar"></progress>
						</div>
						<div className="metric">
							<label>
								Simplicity: {simplicity ? Math.round(simplicity * 100) : 0}%
							</label>
							<progress
								value={simplicity}
								max="1"
								className="progressBar"></progress>
						</div>
						<div className="metric">
							<label>
								Precision: {precision ? Math.round(precision * 100) : 0}%
							</label>
							<progress
								value={precision}
								max="1"
								className="progressBar"></progress>
						</div>
						<div className="metric">
							<label>
								Generalization:{" "}
								{generalization ? Math.round(generalization * 100) : 0}%
							</label>
							<progress
								value={generalization}
								max="1"
								className="progressBar"></progress>
						</div>
					</div>

					<hr className="my-2" />

					<div className="probabilityContainer">
						<label>Auto Probability</label>
						<div className="checkboxSliderContainer"></div>
						<input
							className="checkbox"
							type="checkbox"
							checked={isChecked}
							onChange={handleCheckboxChange}
						/>
						<div className="slidecontainer">
							<p>Probability: {sliderValue}%</p>
							<input
								type="range"
								min="0"
								max="100"
								value={sliderValue}
								className="slider"
								id="myRange"
								style={{ background: "lightblue" }}
								onChange={handleSliderChange}
								onMouseUp={handleSliderMouseUp}
								disabled={isChecked}
							/>
						</div>
					</div>
				</>
			)}
		</div>
	);
};

export default ControlBar;
