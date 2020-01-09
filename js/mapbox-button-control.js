class MapboxGLButtonControl {
  constructor({
    className = "",
    title = "",
    eventHandler = evtHndlr
  }) {
    this._className = className;
    this._title = title;
    this._eventHandler = eventHandler;
  }

  onAdd(map) {
    this._btn = document.createElement("button");
    this._btn.className = "mapboxgl-ctrl-icon" + " " + this._className;
    this._btn.type = "button";
    this._btn.title = this._title;
    this._btn.onclick = this._eventHandler;

    this._container = document.createElement("div");
    this._container.className = "mapboxgl-ctrl-group mapboxgl-ctrl";
    this._container.appendChild(this._btn);

    return this._container;
  }

  onRemove() {
    this._container.parentNode.removeChild(this._container);
    this._map = undefined;
  }
}
