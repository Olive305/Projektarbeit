import React from 'react';
import GraphController from './GraphController';
import './ControlBar.css'
import MultiGraphs from './MultiGraphs';
import axios from 'axios';




interface ControlsProps {
  controller: GraphController
  multi: MultiGraphs;
}

const ControlBar: React.FC<ControlsProps> = ({ controller, multi }) => (
  <div>
    <button className='test-Button' onClick={() => {}}>
      <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="currentColor" className="bi bi-plus-circle" viewBox="0 0 16 16">
        <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
        <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4"/>
      </svg>
    </button>

    <button className='test-Button' onClick={() => controller.deleteSelectedNodes()}>
      <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="currentColor" className="bi bi-trash" viewBox="0 0 16 16">
        <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
        <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
      </svg>
    </button>

    <button className='test-Button' onClick={() => controller.deleteSelectedEdges()}>
      <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="currentColor" className="bi bi-file-minus" viewBox="0 0 16 16">
        <path d="M5.5 8a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1H6a.5.5 0 0 1-.5-.5"/>
        <path d="M4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2zm0 1h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1"/>
      </svg>
    </button>

    <button className='test-Button' onClick={() => multi.copySelectedNodes(multi.getIndexOf(controller))}>
      Copy
    </button>

    <button className='test-Button' onClick={() => multi.pasteNodesIntoGraph(multi.getIndexOf(controller))}>
      Paste
    </button>

    <button className='test-Button' onClick={async () => console.log(await axios.get("http://127.0.0.1:8080/api/test"))}>
      Check Server
    </button>

    <button className='test-Button' onClick={async () => console.log(controller.preview_nodes)}>
      TestNew
    </button>
  </div>);

export default ControlBar;
