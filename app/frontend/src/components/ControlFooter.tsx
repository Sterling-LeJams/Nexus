import CameraSvg from "../assets/camera-outlined-svgrepo-com.svg";
import CutSvg from "../assets/cut-svgrepo-com.svg";
import HandSvg from "../assets/hand-svgrepo-com.svg";
import LevelsSvg from "../assets/levels.svg";
import RulerSvg from "../assets/ruler-svgrepo-com.svg";
import PencilSvg from "../assets/pencil-svgrepo-com.svg";
import BoxSelectSvg from "../assets/box-select-svgrepo-com.svg";
import EyeSvg from "../assets/eye-svgrepo-com.svg";
import PropertiesSvg from "../assets/properties.svg";
import NodeSvg from "../assets/node-svgrepo-com.svg";

const sections = [
  [
    { icon: CameraSvg, label: "Camera" },
    { icon: CutSvg, label: "Section Cut" },
    { icon: HandSvg, label: "Pan" },
    { icon: LevelsSvg, label: "Levels" },
  ],
  [
    { icon: RulerSvg, label: "Dimension" },
    { icon: PencilSvg, label: "Annotate" },
    { icon: BoxSelectSvg, label: "Box Select" },
    { icon: EyeSvg, label: "Hide" },
  ],
  [
    { icon: PropertiesSvg, label: "Properties" },
    { icon: NodeSvg, label: "Model Browser" },
  ],
];

function ControlFooter() {
  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
      <div
        className="flex items-center gap-1 px-3 py-2 rounded-xl shadow-lg"
        style={{ backgroundColor: "rgba(255, 255, 255, 0.5)" }}
      >
        {sections.map((items, sectionIdx) => (
          <div key={sectionIdx} className="flex items-center">
            {sectionIdx > 0 && (
              <div className="w-px h-6 bg-gray-400 mx-2" />
            )}
            <div className="flex items-center gap-1">
              {items.map(({ icon, label }, iconIdx) => (
                <button
                  key={iconIdx}
                  title={label}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/50 transition-colors cursor-pointer"
                >
                  <img src={icon} alt={label} className="w-5 h-5" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ControlFooter;
