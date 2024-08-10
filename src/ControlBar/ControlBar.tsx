import React from 'react';
import GraphController from './GraphController';
import './ControlBar.css'

interface ControlsProps {
  controller: GraphController
}

const ControlBar: React.FC<ControlsProps> = ({ controller }) => (
  <div>
    <button className='test-Button' onClick={() => controller.addNodeWithEdgeFromSelected()}>Add Node</button>
    <button className='test-Button' onClick={() => controller.deleteSelectedNodes()}>Delete Nodes</button>
    <button className='test-Button' onClick={() => controller.deleteSelectedEdges()}>Delete Edge</button>
  </div>
);

export default ControlBar;
