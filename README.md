# Starten

Auf Linux: start.sh ausführen

Auf Windows: start.bat ausführen

Diese Dateien installieren die dependencies und starten das Frontend und das Backend

# kaputte Funktionen

copy / paste

Umbenennen von Knoten

Selbständiges Erzeugen von Knoten

# teilweise kaputt

(möglicherweise) speichern und laden von Graphen als Datei

# kurze Erklärung der wichtigsten Funktionen

Auf dem Kanvas wird der Graph als Kanten und Knoten angezeigt. Der Server schickt die Vorhersagen für die Knoten, die angehängt werden sollen, welche als grüne Knoten mit blauen, gestrichelten Kanten angezeigt werden. Klickt man solch eine Vorhersage an, wird diese ausgewählt.

Jede Vorhersage hat eine Wahrscheinlichkeit, mit der diese getroffen wird. Mit dem Probability Slider kann eingestellt werden, mit welcher Wahrscheinlichkeit eine Vorhersage angezeigt werden soll. Je höher die Wahrscheinlichkeit, desto weniger werden angezeigt. Außerdem gibt es die Möglichkeit die Menge der angezeigten Vorhersagen automatisch berechnen zu lassen. Diese Funktion ist automatisch eingeschaltet und läst sich durch die Checkbox an oder ausschalten.

Klickt man auf existierenende Knoten, so werden diese Ausgewählt. Dadurch lassen sich alle ausgewählten Knoten löschen, kopieren und später auch gleichzeitig verschieben.
Man kann Knoten auch mit einem "Lasso" (blaues Rechteck) auswählen, doch die Funktion is fehlerhaft.

Rechtsklick auf Knoten oder Kanten öffnet ein Menü, dass es erlaubt diese zu löschen. Später werden weiterer Funktionen dazu kommen.

Über dem Kanvas auf dem die Graphen abgebildet werden befinden sich buttons. Die Seite öffnet immer mit einem "New" button. Dieses sind Tabs (Design wird wie im Rest der Seite noch überarbeitet), die erlauben, dass man mehrere Graphen gleichzeitig öffnen kann. Im File tab (oben links) lassen sich neue Tabs öffnen, bestehende Dateien öffnen, oder den Graph als Datei speichern.

Der "To Petri net" button öffnet einen neuen Tab, in dem der Graph als Petri Netz dargestellt wird. Für das Petri Netz werden keine Vorschläge, also Vorhersagen gemacht.

Oben im header befindet sich ein Button, auf dem der Name der aktuell verwendeten Prediction Matrix angezeigt wird (wird später verändert, sodass die Funktion des Knopfes dort steht). Klickt man auf diesen Knopf, werden alle verfügbaren Matrizen angezeigt und man kann die verwendete Matrix wechseln. Dadurch werden andere Knoten vorgeschlagen

