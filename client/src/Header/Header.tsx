import React from 'react';
import './header.css';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

interface HeaderProps {
  createNewGraph: (name: string) => void;
  readGraphFromFile: (file: File) => Promise<void>;
  saveGraphAs: (index: number) => Promise<void>;
  saveAllGraphs: () => Promise<void>;
  activeTabIndex: number;
  handleConvertToPetriNet: (index: number) => void;
}

const Header: React.FC<HeaderProps> = ({
  createNewGraph,
  readGraphFromFile,
  saveGraphAs,
  saveAllGraphs,
  activeTabIndex,
}) => {
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
      <nav className="container mx-auto p-4">
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
      </nav>
      <hr />
    </header>
  );
};

export default Header;
