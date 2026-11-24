const LEAFLET_STYLE_ID = "ngeprint-leaflet-core-css";

// Standards-compliant Leaflet 1.9.x core stylesheet (without IE filters or relative url(images/...) assets)
// so Next.js 16 Turbopack builds stay 100% clean.
const LEAFLET_CORE_CSS = `
.leaflet-pane,
.leaflet-tile,
.leaflet-marker-icon,
.leaflet-marker-shadow,
.leaflet-tile-container,
.leaflet-pane > svg,
.leaflet-pane > canvas,
.leaflet-zoom-box,
.leaflet-image-layer,
.leaflet-layer {
  position: absolute;
  left: 0;
  top: 0;
}
.leaflet-container {
  overflow: hidden;
  -webkit-tap-highlight-color: transparent;
  background: #ede8df;
  outline-offset: 1px;
  font-family: inherit;
}
.leaflet-tile,
.leaflet-marker-icon,
.leaflet-marker-shadow {
  user-select: none;
  -webkit-user-drag: none;
}
.leaflet-container img.leaflet-tile {
  max-width: none !important;
  max-height: none !important;
}
.leaflet-tile {
  visibility: hidden;
}
.leaflet-tile-loaded {
  visibility: inherit;
}
.leaflet-zoom-box {
  width: 0;
  height: 0;
  box-sizing: border-box;
  z-index: 800;
  border: 2px dotted #38f;
  background: rgba(255, 255, 255, 0.5);
}
.leaflet-overlay-pane svg {
  -moz-user-select: none;
}
.leaflet-tile-pane { z-index: 200; }
.leaflet-overlay-pane { z-index: 400; }
.leaflet-shadow-pane { z-index: 500; }
.leaflet-marker-pane { z-index: 600; }
.leaflet-tooltip-pane { z-index: 650; }
.leaflet-popup-pane { z-index: 700; }
.leaflet-map-pane canvas { z-index: 100; }
.leaflet-map-pane svg { z-index: 200; }
.leaflet-control {
  position: relative;
  z-index: 800;
  pointer-events: auto;
  float: left;
  clear: both;
}
.leaflet-top,
.leaflet-bottom {
  position: absolute;
  z-index: 1000;
  pointer-events: none;
}
.leaflet-top { top: 0; }
.leaflet-right { right: 0; }
.leaflet-bottom { bottom: 0; }
.leaflet-left { left: 0; }
.leaflet-right .leaflet-control { float: right; margin-right: 10px; }
.leaflet-top .leaflet-control { margin-top: 10px; }
.leaflet-bottom .leaflet-control { margin-bottom: 10px; }
.leaflet-left .leaflet-control { margin-left: 10px; }
.leaflet-control-zoom,
.leaflet-control-layers,
.leaflet-bar {
  box-shadow: 0 2px 8px rgba(31, 27, 22, 0.12);
  border-radius: 10px;
  border: 1px solid rgba(31, 27, 22, 0.14);
  overflow: hidden;
}
.leaflet-bar a {
  background-color: #fdfbf7;
  border-bottom: 1px solid rgba(31, 27, 22, 0.1);
  width: 30px;
  height: 30px;
  line-height: 29px;
  display: block;
  text-align: center;
  text-decoration: none;
  color: #1f1b16;
  font-weight: 600;
  font-size: 16px;
}
.leaflet-bar a:hover {
  background-color: #efe9df;
}
.leaflet-bar a:last-child {
  border-bottom: none;
}
.leaflet-bar a.leaflet-disabled {
  cursor: default;
  background-color: #f4f1ea;
  color: #a39b8e;
}
.leaflet-container .leaflet-control-attribution {
  background: rgba(253, 251, 247, 0.85);
  margin: 0;
  padding: 2px 7px;
  font-size: 10px;
  color: #5e554a;
  border-top-left-radius: 6px;
}
.leaflet-control-attribution a {
  color: #1f1b16;
  text-decoration: none;
}
.leaflet-grab {
  cursor: grab;
}
.leaflet-dragging .leaflet-grab {
  cursor: grabbing;
}
.leaflet-clickable,
.leaflet-interactive {
  cursor: pointer;
}
.leaflet-popup {
  position: absolute;
  text-align: left;
  margin-bottom: 20px;
}
.leaflet-popup-content-wrapper {
  padding: 1px;
  text-align: left;
  border-radius: 14px;
  background: #fdfbf7;
  color: #1f1b16;
  border: 1px solid rgba(31, 27, 22, 0.14);
  box-shadow: 0 12px 28px rgba(31, 27, 22, 0.16);
}
.leaflet-popup-content {
  margin: 12px 14px;
  line-height: 1.45;
  font-size: 12px;
  min-width: 210px;
  max-width: 260px;
}
.leaflet-popup-tip-container {
  width: 40px;
  height: 20px;
  position: absolute;
  left: 50%;
  margin-top: -1px;
  margin-left: -20px;
  overflow: hidden;
  pointer-events: none;
}
.leaflet-popup-tip {
  width: 15px;
  height: 15px;
  padding: 1px;
  margin: -10px auto 0;
  transform: rotate(45deg);
  background: #fdfbf7;
  border-right: 1px solid rgba(31, 27, 22, 0.14);
  border-bottom: 1px solid rgba(31, 27, 22, 0.14);
}
.leaflet-container a.leaflet-popup-close-button {
  position: absolute;
  top: 6px;
  right: 7px;
  width: 22px;
  height: 22px;
  font: 16px/22px Tahoma, Verdana, sans-serif;
  color: #7b7266;
  text-decoration: none;
  text-align: center;
  border-radius: 6px;
}
.leaflet-container a.leaflet-popup-close-button:hover {
  color: #1f1b16;
  background: #efe9df;
}
.leaflet-fade-anim .leaflet-popup {
  opacity: 0;
  transition: opacity 0.18s linear;
}
.leaflet-fade-anim .leaflet-map-pane .leaflet-popup {
  opacity: 1;
}
.leaflet-zoom-anim .leaflet-zoom-animated {
  transition: transform 0.22s cubic-bezier(0, 0, 0.25, 1);
}
.ngeprint-pin-icon {
  background: transparent;
  border: none;
}
@keyframes ngeprint-gps-pulse {
  0% { transform: scale(1); opacity: 0.55; }
  70% { transform: scale(2.1); opacity: 0; }
  100% { transform: scale(2.1); opacity: 0; }
}
.ngeprint-gps-ring {
  animation: ngeprint-gps-pulse 2s infinite ease-out;
}
`;

export function ensureLeafletStyles(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(LEAFLET_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = LEAFLET_STYLE_ID;
  style.textContent = LEAFLET_CORE_CSS;
  document.head.appendChild(style);
}
