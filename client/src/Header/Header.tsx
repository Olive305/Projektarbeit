import React, { useState, useEffect } from 'react';
import './header.css';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';

interface HeaderProps {
  createNewGraph: (name: string) => void;
  readGraphFromFile: (file: File) => Promise<void>;
  saveGraph: (index: number) => Promise<void>;
  saveAllGraphs: () => Promise<void>;
  activeTabIndex: number;
  setActiveMatrix: (matrix: string) => void;
  toggleRainbowPredictions: () => void;
  handleToPetriNet: () => void;
}

const Header: React.FC<HeaderProps> = ({
  createNewGraph,
  readGraphFromFile,
  saveGraph,
  saveAllGraphs,
  activeTabIndex,
  setActiveMatrix,
  toggleRainbowPredictions,
  handleToPetriNet,
}) => {
  const [_, setSelectedMatrix] = useState(''); // Default selected matrix
  const [matrices, setMatrices] = useState<string[]>([]);   // Matrices fetched from API
  const [loading, setLoading] = useState(true);  // Loading state to indicate API call

  useEffect(() => {
    const fetchMatrices = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8081/api/getMatrices'); // Ensure correct API endpoint
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`); // Handle bad responses
        }
        const data = await response.json();
  
        // Check if the data is correctly formatted
        if (data && data.available_matrices) {
          console.log(data.available_matrices);
          setMatrices(data.available_matrices);  // Set available matrices
          setSelectedMatrix(data.default_matrix || ''); // Set selected matrix if available
        } else {
          throw new Error("Invalid data structure from API");
        }
      } catch (error) {
        console.error("Error fetching matrices:", error instanceof Error ? error.message : error);
        alert("Failed to fetch matrices. Please check the console for details.");
      } finally {
        setLoading(false); // End loading state
      }
    };
  
    fetchMatrices();
  }, []); // Empty dependency array ensures this runs on component mount

  // Handle matrix change
  const handleMatrixChange = async (matrix: string) => {
    setSelectedMatrix(matrix);
    setActiveMatrix(matrix); // Trigger the callback for matrix change
  };

  const handleCreateNew = () => {
    const newName = prompt("Enter the name for the new graph:");
    if (newName) {
      createNewGraph(newName);
    }
  };

  const handleOpenFromFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await readGraphFromFile(file);
    }
  };

  const handleSaveCurrent = async () => {
    await saveGraph(activeTabIndex);
  };

  return (
    <header className="">
      <nav className="">
        {/* File Menu */}
        <Menu as="div" className="">
          <div>
            <MenuButton className="dropdown-button">
              File
            </MenuButton>
          </div>
          <MenuItems className="dropdown-menu">
            <div className="py-1">
              <MenuItem>
                {() => (
                  <a
                    href="#"

                    onClick={handleCreateNew}
                  >
                    New
                  </a>
                )}
              </MenuItem>
              <MenuItem>
                <>
                  <label>
                    <input type="file" onChange={handleOpenFromFile} />
                  </label>
                </>
              </MenuItem>
              <MenuItem>
                <a
                  href="#"
                  onClick={handleSaveCurrent}
                >
                  Save
                </a>
              </MenuItem>
              <MenuItem>
                <a
                  href="#"
                  onClick={saveAllGraphs}
                >
                  Save All
                </a>
              </MenuItem>
              <MenuItem>
                <a
                  href="#"
                  onClick={() => {handleToPetriNet()}}
                >
                  Zu Petri Netz
                </a>
              </MenuItem>
            </div>
          </MenuItems>
        </Menu>

        {/* Matrix Menu */}
        <Menu as="div" className="">
          <div>
            <MenuButton className="dropdown-button">
              {loading ? "Loading..." : "Select Matrix"}
            </MenuButton>
          </div>
          <MenuItems className="dropdown-menu">
            <div className="py-1">
              {matrices.length > 0 ? (
                matrices.map((matrix) => (
                  <MenuItem key={matrix}>
                    <a
                      href="#"
                      onClick={() => handleMatrixChange(matrix)}
                    >
                      {matrix}
                    </a>
                  </MenuItem>
                ))
              ) : (
                <div className="px-4 py-2 text-sm text-gray-500">
                  No matrices available
                </div>
              )}
            </div>
          </MenuItems>

        </Menu>

        <Menu as="div" className="">
          <div>
            <MenuButton className="dropdown-button">
              View
            </MenuButton>
          </div>
          <MenuItems className="dropdown-menu">
            <div className="py-1">
              <MenuItem>
                <a
                  href="#"
                  onClick={() => {}}
                >
                  Show Grid
                </a>
              </MenuItem>
              <MenuItem>
                <a
                  href="#"
                  onClick={toggleRainbowPredictions}
                >
                  Rainbow Prediction
                </a>
              </MenuItem>
            </div>
          </MenuItems>
        </Menu>
      </nav>
      <hr />
    </header>
  );
};

export default Header;
