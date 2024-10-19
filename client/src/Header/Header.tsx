import React, { useState, useEffect } from 'react';
import './header.css';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import {View} from './view.tsx'

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

interface HeaderProps {
  createNewGraph: (name: string) => void;
  readGraphFromFile: (file: File) => Promise<void>;
  saveGraphAs: (index: number) => Promise<void>;
  saveAllGraphs: () => Promise<void>;
  activeTabIndex: number;
  setActiveMatrix: (matrix: string) => void;
  view: View;
}

const Header: React.FC<HeaderProps> = ({
  createNewGraph,
  readGraphFromFile,
  saveGraphAs,
  saveAllGraphs,
  activeTabIndex,
  setActiveMatrix,
  view,
}) => {
  const [selectedMatrix, setSelectedMatrix] = useState(''); // Default selected matrix
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
    await saveGraphAs(activeTabIndex);
  };

  return (
    <header className="bg-white shadow">
      <nav className="container mx-auto p-4 flex space-x-4">
        {/* File Menu */}
        <Menu as="div" className="relative inline-block text-left">
          <div>
            <MenuButton className="inline-flex w-full justify-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
              File
            </MenuButton>
          </div>
          <MenuItems className="dropdown-menu">
            <div className="py-1">
              <MenuItem>
                {({ active }) => (
                  <a
                    href="#"
                    className={classNames(active ? 'bg-gray-100 text-gray-900' : 'text-gray-700', 'dropdown-menu-item')}
                    onClick={handleCreateNew}
                  >
                    New
                  </a>
                )}
              </MenuItem>
              <MenuItem>
                {({ active }) => (
                  <>
                    <label className={classNames(active ? 'bg-gray-100 text-gray-900' : 'text-gray-700', 'dropdown-menu-item')}>
                      Open
                      <input type="file" className="hidden" onChange={handleOpenFromFile} />
                    </label>
                  </>
                )}
              </MenuItem>
              <MenuItem>
                {({ active }) => (
                  <a
                    href="#"
                    className={classNames(active ? 'bg-gray-100 text-gray-900' : 'text-gray-700', 'dropdown-menu-item')}
                    onClick={handleSaveCurrent}
                  >
                    Save As
                  </a>
                )}
              </MenuItem>
              <MenuItem>
                {({ active }) => (
                  <a
                    href="#"
                    className={classNames(active ? 'bg-gray-100 text-gray-900' : 'text-gray-700', 'dropdown-menu-item')}
                    onClick={saveAllGraphs}
                  >
                    Save All
                  </a>
                )}
              </MenuItem>
            </div>
          </MenuItems>
        </Menu>

        {/* Matrix Menu */}
        <Menu as="div" className="relative inline-block text-left">
          <div>
            <MenuButton className="inline-flex w-full justify-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
              {loading ? "Loading..." : "Select Matrix"}
            </MenuButton>
          </div>
          <MenuItems className="dropdown-menu">
            <div className="py-1">
              {matrices.length > 0 ? (
                matrices.map((matrix) => (
                  <MenuItem key={matrix}>
                    {({ active }) => (
                      <a
                        href="#"
                        onClick={() => handleMatrixChange(matrix)}
                        className={`${
                          active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                        } block w-full px-4 py-2 text-sm cursor-pointer`} // Ensures each item takes full width
                      >
                        {matrix}
                      </a>
                    )}
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

        <Menu as="div" className="relative inline-block text-left">
          <div>
            <MenuButton className="inline-flex w-full justify-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
              View
            </MenuButton>
          </div>
          <MenuItems className="dropdown-menu">
            <div className="py-1">
              <MenuItem>
                {({ active }) => (
                  <a
                    href="#"
                    className={classNames(active ? 'bg-gray-100 text-gray-900' : 'text-gray-700', 'dropdown-menu-item')}
                    onClick={view.toggleGrid}
                  >
                    Show Grid
                  </a>
                )}
              </MenuItem>
              <MenuItem>
                {({ active }) => (
                  <a
                    href="#"
                    className={classNames(active ? 'bg-gray-100 text-gray-900' : 'text-gray-700', 'dropdown-menu-item')}
                    onClick={view.toggleRainbowPredictions}
                  >
                    Rainbow Prediction
                  </a>
                )}
              </MenuItem>
              <MenuItem>
                {({ active }) => (
                  <a
                    href="#"
                    className={classNames(active ? 'bg-gray-100 text-gray-900' : 'text-gray-700', 'dropdown-menu-item')}
                    onClick={view.toggleDarkMode}
                  >
                    Dark Mode
                  </a>
                )}
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
