type ViewChangeListener = () => void;

class View {
  // Boolean values to control various aspects of the view
  showRainbowPredictions: boolean;
  showGrid: boolean;
  darkMode: boolean;

  // List of listeners that get notified when the view is updated
  private listeners: ViewChangeListener[] = [];

  constructor(view?: View) {
    // Initialize the state for each view option
    this.showRainbowPredictions = view ? view.showRainbowPredictions : true;
    this.showGrid = view ? view.showGrid : false;
    this.darkMode = view ? view.darkMode : false;
  }

  // Add a listener for when the view changes
  public onChange(listener: ViewChangeListener) {
    this.listeners.push(listener);
  }

  // Remove a listener
  public offChange(listener: ViewChangeListener) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  // Notify all listeners of a change
  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }

  // Function to toggle the rainbow predictions
  public toggleRainbowPredictions() {
    console.log("changing rainbow")
    this.showRainbowPredictions = !this.showRainbowPredictions;
    this.notifyListeners(); // Notify listeners after the change
  }

  // Function to toggle the grid display
  public toggleGrid() {
    this.showGrid = !this.showGrid;
    this.notifyListeners(); // Notify listeners after the change
  }

  // Function to toggle dark mode
  public toggleDarkMode() {
    this.darkMode = !this.darkMode;
    this.notifyListeners(); // Notify listeners after the change
  }
}

export { View };
